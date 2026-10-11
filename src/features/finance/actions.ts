'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { localDateToDate } from '@/lib/dates';
import { toMinor, toMntMinor } from '@/lib/money';
import { fieldErrorsFrom, valuesFrom, type FormState } from '@/lib/form-state';
import { optText } from '@/lib/validation';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid'),
  type: z.enum(['INCOME', 'EXPENSE', 'DRIVER_PAYMENT']),
  amount: z.string().trim().min(1, 'required'),
  currency: z.enum(['MNT', 'CNY']),
  fxRate: z.string().trim().optional(),
  method: z.enum(['CASH', 'BANK', 'WECHAT_ALIPAY', 'OTHER']),
  accountId: z.string().min(1, 'required'),
  categoryId: z.string().optional(),
  tripId: z.string().optional(),
  driverId: z.string().optional(),
  counterparty: optText(200),
  note: optText(1000),
});

export async function createTransaction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'finance:write')) return { error: 'forbidden' };

  const values = valuesFrom(formData);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const data = parsed.data;
  const fieldErrors: Record<string, string> = {};

  const date = localDateToDate(data.date);
  if (!date) fieldErrors.date = 'invalid';

  let amountMinor = 0n;
  try {
    amountMinor = toMinor(data.amount);
    if (amountMinor <= 0n) fieldErrors.amount = 'invalid';
  } catch {
    fieldErrors.amount = 'invalid';
  }

  // ¥ гүйлгээнд ханш заавал. ₮ гүйлгээнд ханш хадгалахгүй.
  let fxRate: string | null = null;
  let amountMntMinor = amountMinor;
  if (data.currency === 'CNY') {
    if (!data.fxRate) {
      fieldErrors.fxRate = 'required';
    } else {
      try {
        amountMntMinor = toMntMinor(amountMinor, 'CNY', data.fxRate);
        fxRate = data.fxRate.replace(/[\s,]/g, '');
      } catch {
        fieldErrors.fxRate = 'invalid';
      }
    }
  }

  const account = await db.account.findFirst({ where: { id: data.accountId, isActive: true } });
  if (!account || account.currency !== data.currency) fieldErrors.accountId = 'invalid';

  if (data.categoryId) {
    const category = await db.category.findFirst({ where: { id: data.categoryId, isActive: true } });
    if (!category || category.type !== data.type) fieldErrors.categoryId = 'invalid';
  }

  // Рейс (сонголт) ба жолооч ("Жолоочид олгосон" төрөлд заавал)
  if (data.tripId) {
    const trip = await db.trip.findUnique({ where: { id: data.tripId }, select: { id: true } });
    if (!trip) fieldErrors.tripId = 'invalid';
  }
  const driverId = data.type === 'DRIVER_PAYMENT' ? data.driverId || null : null;
  if (data.type === 'DRIVER_PAYMENT') {
    if (!driverId) {
      fieldErrors.driverId = 'required';
    } else {
      const driver = await db.driver.findUnique({ where: { id: driverId }, select: { id: true } });
      if (!driver) fieldErrors.driverId = 'invalid';
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !date || !account) {
    return { error: 'validation', fieldErrors, values };
  }

  await db.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        date,
        type: data.type,
        amountMinor,
        currency: data.currency,
        fxRate,
        amountMntMinor,
        method: data.method,
        accountId: account.id,
        categoryId: data.categoryId || null,
        tripId: data.tripId || null,
        driverId,
        counterparty: data.counterparty || null,
        note: data.note || null,
        createdById: user.id,
      },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: 'transaction.create',
      entity: 'Transaction',
      entityId: created.id,
      after: created,
    });
  });

  revalidatePath('/', 'layout');
  return redirect({ href: '/finance', locale: await getLocale() });
}

// Гүйлгээг устгахгүй. Шалтгаан бичиж цуцална, өөрчлөлт хяналтын логт үлдэнэ.
export async function voidTransaction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'finance:void')) throw new Error('FORBIDDEN');

  const id = String(formData.get('id') ?? '');
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500);
  if (!id || reason.length < 3) return;

  await db.$transaction(async (tx) => {
    const before = await tx.transaction.findUnique({ where: { id } });
    if (!before || before.status !== 'ACTIVE') return;

    const after = await tx.transaction.update({
      where: { id },
      data: { status: 'VOID', voidReason: reason, voidedAt: new Date(), voidedById: user.id },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: 'transaction.void',
      entity: 'Transaction',
      entityId: id,
      before,
      after,
    });
  });

  revalidatePath('/', 'layout');
}
