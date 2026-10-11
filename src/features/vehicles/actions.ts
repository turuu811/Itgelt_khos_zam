'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { localDateToDate } from '@/lib/dates';
import { fieldErrorsFrom, valuesFrom, type FormState } from '@/lib/form-state';
import { optText } from '@/lib/validation';

const dateOrEmpty = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid').or(z.literal(''));
const capacity = z.string().trim().regex(/^\d{1,6}$/, 'invalid').or(z.literal(''));

const createSchema = z.object({
  plateNumber: z.string().trim().min(1, 'required').max(20, 'invalid'),
  type: optText(100),
  capacityKg: capacity,
  insuranceExpiresAt: dateOrEmpty,
  inspectionExpiresAt: dateOrEmpty,
});

const normalizePlate = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();

export async function createVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) return { error: 'forbidden' };

  const values = valuesFrom(formData);
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const d = parsed.data;

  try {
    const created = await db.vehicle.create({
      data: {
        plateNumber: normalizePlate(d.plateNumber),
        type: d.type || null,
        capacityKg: d.capacityKg ? Number(d.capacityKg) : null,
        insuranceExpiresAt: d.insuranceExpiresAt ? localDateToDate(d.insuranceExpiresAt) : null,
        inspectionExpiresAt: d.inspectionExpiresAt ? localDateToDate(d.inspectionExpiresAt) : null,
      },
    });
    await writeAudit(db, { userId: user.id, action: 'vehicle.create', entity: 'Vehicle', entityId: created.id, after: created });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'validation', fieldErrors: { plateNumber: 'duplicate' }, values };
    }
    throw e;
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateVehicle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) throw new Error('FORBIDDEN');

  const id = String(formData.get('id') ?? '');
  const type = String(formData.get('type') ?? '').trim().slice(0, 100);
  const capacityKg = String(formData.get('capacityKg') ?? '').trim();
  const insurance = String(formData.get('insuranceExpiresAt') ?? '');
  const inspection = String(formData.get('inspectionExpiresAt') ?? '');
  const isActive = formData.get('isActive') === 'on';
  if (!id) return;
  if (capacityKg && !/^\d{1,6}$/.test(capacityKg)) return;

  const before = await db.vehicle.findUnique({ where: { id } });
  if (!before) return;

  const after = await db.vehicle.update({
    where: { id },
    data: {
      type: type || null,
      capacityKg: capacityKg ? Number(capacityKg) : null,
      insuranceExpiresAt: insurance ? localDateToDate(insurance) : null,
      inspectionExpiresAt: inspection ? localDateToDate(inspection) : null,
      isActive,
    },
  });
  await writeAudit(db, { userId: user.id, action: 'vehicle.update', entity: 'Vehicle', entityId: id, before, after });

  revalidatePath('/', 'layout');
}
