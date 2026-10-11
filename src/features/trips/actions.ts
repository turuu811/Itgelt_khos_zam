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
import { localDateToDate } from '@/lib/dates';
import { fieldErrorsFrom, valuesFrom, type FormState } from '@/lib/form-state';
import { optText } from '@/lib/validation';
import { CLOSED_STATUSES, isCargoStatus } from '@/features/cargo/constants';
import { generateTripNumber } from './number';
import { isTripStatus } from './constants';

const dateOrEmpty = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid').or(z.literal(''));

const createSchema = z.object({
  vehicleId: z.string().min(1, 'required'),
  driverId: z.string().min(1, 'required'),
  departAt: dateOrEmpty,
  arriveAt: dateOrEmpty,
  note: optText(1000),
});

export async function createTrip(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) return { error: 'forbidden' };

  const values = valuesFrom(formData);
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const d = parsed.data;

  const departAt = d.departAt ? localDateToDate(d.departAt) : null;
  const arriveAt = d.arriveAt ? localDateToDate(d.arriveAt) : null;
  if (departAt && arriveAt && arriveAt < departAt) {
    return { error: 'validation', fieldErrors: { arriveAt: 'invalid' }, values };
  }

  const [vehicle, driver] = await Promise.all([
    db.vehicle.findFirst({ where: { id: d.vehicleId, isActive: true } }),
    db.driver.findFirst({ where: { id: d.driverId, isActive: true } }),
  ]);
  const fieldErrors: Record<string, string> = {};
  if (!vehicle) fieldErrors.vehicleId = 'invalid';
  if (!driver) fieldErrors.driverId = 'invalid';
  if (!vehicle || !driver) return { error: 'validation', fieldErrors, values };

  let tripId: string | null = null;
  for (let attempt = 0; attempt < 3 && !tripId; attempt++) {
    try {
      const trip = await db.$transaction(async (tx) => {
        const created = await tx.trip.create({
          data: {
            tripNumber: generateTripNumber(),
            vehicleId: vehicle.id,
            driverId: driver.id,
            departAt,
            arriveAt,
            note: d.note || null,
            status: 'PLANNED',
          },
        });
        await writeAudit(tx, { userId: user.id, action: 'trip.create', entity: 'Trip', entityId: created.id, after: created });
        return created;
      });
      tripId = trip.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      throw e;
    }
  }
  if (!tripId) return { error: 'unknown', values };

  revalidatePath('/', 'layout');
  return redirect({ href: `/trips/${tripId}`, locale: await getLocale() });
}

export async function updateTripStatus(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) throw new Error('FORBIDDEN');

  const tripId = String(formData.get('tripId') ?? '');
  const status = formData.get('status');
  if (!tripId || !isTripStatus(status)) return;

  await db.$transaction(async (tx) => {
    const before = await tx.trip.findUnique({ where: { id: tripId } });
    if (!before || before.status === status) return;

    const after = await tx.trip.update({ where: { id: tripId }, data: { status } });
    await writeAudit(tx, {
      userId: user.id,
      action: 'trip.status_change',
      entity: 'Trip',
      entityId: tripId,
      before: { status: before.status },
      after: { status: after.status },
    });
  });

  revalidatePath('/', 'layout');
}

// Ачааг рейсэд оноох (зөвхөн рейсэд оноогоогүй, дуусаагүй ачаа)
export async function assignCargoToTrip(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) throw new Error('FORBIDDEN');

  const tripId = String(formData.get('tripId') ?? '');
  const cargoId = String(formData.get('cargoId') ?? '');
  if (!tripId || !cargoId) return;

  await db.$transaction(async (tx) => {
    const [trip, cargo] = await Promise.all([
      tx.trip.findUnique({ where: { id: tripId } }),
      tx.cargo.findUnique({ where: { id: cargoId } }),
    ]);
    if (!trip || !cargo) return;
    if (trip.status === 'CLOSED' || cargo.tripId || CLOSED_STATUSES.includes(cargo.status)) return;

    await tx.cargo.update({ where: { id: cargoId }, data: { tripId } });
    await writeAudit(tx, {
      userId: user.id,
      action: 'cargo.assign_trip',
      entity: 'Cargo',
      entityId: cargoId,
      before: { tripId: null },
      after: { tripId },
    });
  });

  revalidatePath('/', 'layout');
}

export async function unassignCargoFromTrip(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) throw new Error('FORBIDDEN');

  const tripId = String(formData.get('tripId') ?? '');
  const cargoId = String(formData.get('cargoId') ?? '');
  if (!tripId || !cargoId) return;

  await db.$transaction(async (tx) => {
    const [trip, cargo] = await Promise.all([
      tx.trip.findUnique({ where: { id: tripId } }),
      tx.cargo.findUnique({ where: { id: cargoId } }),
    ]);
    if (!trip || !cargo || trip.status === 'CLOSED' || cargo.tripId !== tripId) return;

    await tx.cargo.update({ where: { id: cargoId }, data: { tripId: null } });
    await writeAudit(tx, {
      userId: user.id,
      action: 'cargo.unassign_trip',
      entity: 'Cargo',
      entityId: cargoId,
      before: { tripId },
      after: { tripId: null },
    });
  });

  revalidatePath('/', 'layout');
}

// Рейс дээрх БҮХ ачааны төлвийг нэг дор шинэчилнэ (жишээ: "Замд гарсан")
export async function bulkUpdateCargoStatus(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write') || !can(user.role, 'cargo:status')) throw new Error('FORBIDDEN');

  const tripId = String(formData.get('tripId') ?? '');
  const status = formData.get('status');
  const location = String(formData.get('location') ?? '').trim().slice(0, 200);
  const note = String(formData.get('note') ?? '').trim().slice(0, 500);
  if (!tripId || !isCargoStatus(status)) return;

  await db.$transaction(async (tx) => {
    const cargo = await tx.cargo.findMany({ where: { tripId, NOT: { status } } });

    for (const c of cargo) {
      await tx.cargo.update({ where: { id: c.id }, data: { status } });
      await tx.cargoStatusHistory.create({
        data: { cargoId: c.id, status, location: location || null, note: note || null, changedById: user.id },
      });
      await writeAudit(tx, {
        userId: user.id,
        action: 'cargo.status_change',
        entity: 'Cargo',
        entityId: c.id,
        before: { status: c.status },
        after: { status, location, note, tripId, bulk: true },
      });
    }
  });

  revalidatePath('/', 'layout');
}
