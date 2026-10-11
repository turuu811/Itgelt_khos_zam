import { getTranslations, setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { currentMonth, formatDate, monthRange } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { monthTotals } from '@/features/finance/queries';
import { PageTitle } from '@/components/ui/page-title';

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  await requirePermission('report:read');
  setRequestLocale(locale);
  const t = await getTranslations('reports');
  const tc = await getTranslations('common');
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month ?? '') ? query.month! : currentMonth();
  const range = monthRange(month)!;
  const [totals, transactions, trips] = await Promise.all([
    monthTotals(month),
    db.transaction.groupBy({
      by: ['tripId', 'type'],
      where: { status: 'ACTIVE', date: { gte: range.start, lt: range.end }, tripId: { not: null } },
      _sum: { amountMntMinor: true },
    }),
    db.trip.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, tripNumber: true, vehicle: { select: { plateNumber: true } }, driver: { select: { name: true } } } }),
  ]);
  const tripReports = new Map<string, { income: bigint; expense: bigint; driverPayment: bigint }>();
  for (const row of transactions) {
    if (!row.tripId) continue;
    const item = tripReports.get(row.tripId) ?? { income: 0n, expense: 0n, driverPayment: 0n };
    const sum = row._sum.amountMntMinor ?? 0n;
    if (row.type === 'INCOME') item.income = sum;
    else if (row.type === 'EXPENSE') item.expense = sum;
    else item.driverPayment = sum;
    tripReports.set(row.tripId, item);
  }
  const rows = trips.filter((trip) => tripReports.has(trip.id)).map((trip) => {
    const totals = tripReports.get(trip.id)!;
    return { ...trip, ...totals, profit: totals.income - totals.expense - totals.driverPayment };
  });
  const summary = totals ? [
    [t('income'), totals.income, 'text-emerald-700'],
    [t('expense'), totals.expense, 'text-amber-700'],
    [t('driverPayment'), totals.driverPayment, 'text-sky-700'],
    [t('profit'), totals.profit, 'text-teal-800'],
  ] as const : [];

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('totalsNote')} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{summary.map(([label, amount, color]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`mt-3 text-2xl font-bold ${color}`}>{formatMinor(amount, 'MNT')}</p></article>)}</section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="font-bold">{t('tripResults')}</h2><form className="flex items-center gap-2"><label htmlFor="report-month" className="text-sm text-slate-500">{t('month')}</label><input id="report-month" type="month" name="month" defaultValue={month} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /><button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">{tc('search')}</button></form></div>
        {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{[t('trip'), t('vehicle'), t('driver'), t('income'), t('expense'), t('driverPayment'), t('profit')].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-4 py-4 font-semibold">{row.tripNumber}</td><td className="px-4 py-4">{row.vehicle.plateNumber}</td><td className="px-4 py-4">{row.driver.name}</td><td className="px-4 py-4">{formatMinor(row.income, 'MNT')}</td><td className="px-4 py-4">{formatMinor(row.expense, 'MNT')}</td><td className="px-4 py-4">{formatMinor(row.driverPayment, 'MNT')}</td><td className="px-4 py-4 font-bold">{formatMinor(row.profit, 'MNT')}</td></tr>)}</tbody>
        </table></div> : <p className="p-6 text-sm text-slate-500">{t('noTrips')}</p>}
      </section>
      <p className="text-xs leading-5 text-slate-500">{t('totalsNote')}</p>
    </div>
  );
}
