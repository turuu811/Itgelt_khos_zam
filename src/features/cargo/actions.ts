'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { Prisma } from '@/generated/prisma/client';
import { redirect } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { fieldErrorsFrom, valuesFrom, type FormState } from '@/lib/form-state';
import { optDecimal, optText } from '@/lib/validation';
import { generateTrackCode } from './track-code';
import { isCargoStatus } from './constants';

const createSchema = z.object({
  customerId: z.string().min(1, 'required'),
  containerInfo: z.string().trim().max(11, 'invalid').regex(/^(?:[A-Za-z]{4}\d{7})?$/, 'invalid').transform((value) => value.toUpperCase()),
  quantity: z.coerce.number().int('invalid').min(1, 'invalid').max(100000, 'invalid'),
  weightKg: optDecimal,
  volumeM3: optDecimal,
  note: optText(1000),
});

export async function createCargo(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'cargo:write')) return { error: 'forbidden' };

  const values = valuesFrom(formData);
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const data = parsed.data;

  const customer = await db.customer.findFirst({ where: { id: data.customerId, isActive: true } });
  if (!customer) return { error: 'validation', fieldErrors: { customerId: 'invalid' }, values };

  let cargoId: string | null = null;
  for (let attempt = 0; attempt < 3 && !cargoId; attempt++) {
    try {
      const cargo = await db.$transaction(async (tx) => {
        const recent = await tx.cargo.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { trackCode: true },
        });
        const created = await tx.cargo.create({
          data: {
            trackCode: generateTrackCode(recent.map((item) => item.trackCode)),
            customerId: customer.id,
            containerInfo: data.containerInfo || null,
            quantity: data.quantity,
            weightKg: data.weightKg || null,
            volumeM3: data.volumeM3 || null,
            note: data.note || null,
            status: 'RECEIVED_ERLIAN',
          },
        });
        await tx.cargoStatusHistory.create({
          data: { cargoId: created.id, status: 'RECEIVED_ERLIAN', changedById: user.id },
        });
        await writeAudit(tx, {
          userId: user.id,
          action: 'cargo.create',
          entity: 'Cargo',
          entityId: created.id,
          after: created,
        });
        return created;
      });
      cargoId = cargo.id;
    } catch (e) {
      // Track код давхцвал дахин үүсгэнэ
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      throw e;
    }
  }
  if (!cargoId) return { error: 'unknown', values };

  revalidatePath('/', 'layout');
  return redirect({ href: `/cargo/${cargoId}`, locale: await getLocale() });
}

export async function updateCargoStatus(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'cargo:status')) throw new Error('FORBIDDEN');

  const cargoId = String(formData.get('cargoId') ?? '');
  const status = formData.get('status');
  const location = String(formData.get('location') ?? '').trim().slice(0, 200);
  const note = String(formData.get('note') ?? '').trim().slice(0, 500);
  if (!cargoId || !isCargoStatus(status)) return;

  await db.$transaction(async (tx) => {
    const before = await tx.cargo.findUnique({ where: { id: cargoId } });
    if (!before || before.status === status) return;

    const after = await tx.cargo.update({ where: { id: cargoId }, data: { status } });
    await tx.cargoStatusHistory.create({
      data: { cargoId, status, location: location || null, note: note || null, changedById: user.id },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: 'cargo.status_change',
      entity: 'Cargo',
      entityId: cargoId,
      before: { status: before.status },
      after: { status: after.status, location, note },
    });
  });

  revalidatePath('/', 'layout');
}
