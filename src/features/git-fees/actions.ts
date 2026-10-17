'use server';

import { Prisma } from '@/generated/prisma/client';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { toMinor } from '@/lib/money';

function recordData(formData: FormData) {
  const period = String(formData.get('period') ?? '');
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  const year = match ? Number(match[1]) : 0;
  const month = match ? Number(match[2]) : 0;
  const vehicleId = String(formData.get('vehicleId') ?? '');
  const customerId = String(formData.get('customerId') ?? '');
  const amountText = String(formData.get('amount') ?? '').trim();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!vehicleId || !customerId) return null;

  try {
    const amountMinor = toMinor(amountText);
    if (amountMinor <= 0n) return null;
    return {
      year,
      month,
      vehicleId,
      customerId,
      amountMinor,
      isPaid: formData.get('isPaid') === 'on',
      numberIssued: formData.get('numberIssued') === 'on',
    };
  } catch {
    return null;
  }
}

async function finish(result: string): Promise<void> {
  const locale = await getLocale();
  redirect({ href: `/git-fees?result=${result}`, locale });
}

export async function createGitFee(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) return finish('forbidden');
  const data = recordData(formData);
  if (!data) return finish('invalid');

  const [vehicle, customer] = await Promise.all([
    db.vehicle.findUnique({ where: { id: data.vehicleId }, select: { id: true } }),
    db.customer.findUnique({ where: { id: data.customerId }, select: { id: true } }),
  ]);
  if (!vehicle || !customer) return finish('invalid');

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.gitFeeRecord.create({ data });
      await writeAudit(tx, {
        userId: user.id,
        action: 'git_fee.create',
        entity: 'GitFeeRecord',
        entityId: created.id,
        after: created,
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return finish('duplicate');
    throw error;
  }

  revalidatePath('/', 'layout');
  return finish('created');
}

export async function updateGitFee(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) return finish('forbidden');
  const id = String(formData.get('id') ?? '');
  const data = recordData(formData);
  if (!id || !data) return finish('invalid');

  const before = await db.gitFeeRecord.findUnique({ where: { id } });
  if (!before) return finish('invalid');
  const [vehicle, customer] = await Promise.all([
    db.vehicle.findUnique({ where: { id: data.vehicleId }, select: { id: true } }),
    db.customer.findUnique({ where: { id: data.customerId }, select: { id: true } }),
  ]);
  if (!vehicle || !customer) return finish('invalid');

  try {
    await db.$transaction(async (tx) => {
      const after = await tx.gitFeeRecord.update({ where: { id }, data });
      await writeAudit(tx, {
        userId: user.id,
        action: 'git_fee.update',
        entity: 'GitFeeRecord',
        entityId: id,
        before,
        after,
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return finish('duplicate');
    throw error;
  }

  revalidatePath('/', 'layout');
  return finish('saved');
}
