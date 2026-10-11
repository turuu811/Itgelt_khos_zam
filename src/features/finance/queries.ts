import type { TransactionType } from '@/generated/prisma/enums';
import { db } from '@/lib/db';
import { monthRange } from '@/lib/dates';

// Сарын нийт дүн (₮-ээр). Зөвхөн идэвхтэй (цуцлагдаагүй) гүйлгээг тооцно.
export async function monthTotals(month: string) {
  const range = monthRange(month);
  if (!range) return null;

  const rows = await db.transaction.groupBy({
    by: ['type'],
    where: { status: 'ACTIVE', date: { gte: range.start, lt: range.end } },
    _sum: { amountMntMinor: true },
  });

  const sum = (type: TransactionType): bigint => rows.find((r) => r.type === type)?._sum.amountMntMinor ?? 0n;

  const income = sum('INCOME');
  const expense = sum('EXPENSE');
  const driverPayment = sum('DRIVER_PAYMENT');

  return { income, expense, driverPayment, profit: income - expense - driverPayment };
}

// Рейс бүрийн нийт дүн (₮-ээр), зөвхөн идэвхтэй гүйлгээ. Ашиг = орлого − зарлага − жолоочид олгосон.
export type TripTotals = { income: bigint; expense: bigint; driverPayment: bigint; profit: bigint };

export async function tripTotalsFor(tripIds: string[]): Promise<Map<string, TripTotals>> {
  const result = new Map<string, TripTotals>();
  if (tripIds.length === 0) return result;

  const rows = await db.transaction.groupBy({
    by: ['tripId', 'type'],
    where: { tripId: { in: tripIds }, status: 'ACTIVE' },
    _sum: { amountMntMinor: true },
  });

  for (const id of tripIds) result.set(id, { income: 0n, expense: 0n, driverPayment: 0n, profit: 0n });

  for (const row of rows) {
    if (!row.tripId) continue;
    const totals = result.get(row.tripId)!;
    const sum = row._sum.amountMntMinor ?? 0n;
    if (row.type === 'INCOME') totals.income += sum;
    else if (row.type === 'EXPENSE') totals.expense += sum;
    else totals.driverPayment += sum;
  }
  for (const totals of result.values()) totals.profit = totals.income - totals.expense - totals.driverPayment;

  return result;
}
