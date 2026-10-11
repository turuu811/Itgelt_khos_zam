import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { can } from '@/lib/permissions';
import { currentMonth, formatDate, monthRange } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { monthTotals } from '@/features/finance/queries';
import { PageTitle } from '@/components/ui/page-title';

export default async function FinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ locale }, query, user] = await Promise.all([params, searchParams, requirePermission('finance:read')]);
  setRequestLocale(locale);
  const t = await getTranslations('finance');
  const tc = await getTranslations('common');
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month ?? '') ? query.month! : currentMonth();
  const range = monthRange(month)!;
  const [totals, rows] = await Promise.all([
    monthTotals(month),
    db.transaction.findMany({
      where: { date: { gte: range.start, lt: range.end } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
        trip: { select: { tripNumber: true } },
        driver: { select: { name: true } },
        attachments: { select: { id: true, fileName: true, sizeBytes: true } },
      },
    }),
  ]);
  const cards = totals ? [
    [t('income'), totals.income, 'text-emerald-700'],
    [t('expense'), totals.expense, 'text-amber-700'],
    [t('driverPayment'), totals.driverPayment, 'text-sky-700'],
    [t('profit'), totals.profit, 'text-teal-800'],
  ] as const : [];

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('totalsNote')} action={can(user.role, 'finance:write') ? <Link href="/finance/new" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">{t('new')} +</Link> : undefined} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, amount, color]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`mt-3 text-2xl font-bold tracking-tight ${color}`}>{formatMinor(amount, 'MNT')}</p></article>)}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-950">{t('transactions')}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <form className="flex items-center gap-2"><label htmlFor="finance-month" className="text-sm text-slate-500">{t('month')}</label><input id="finance-month" type="month" name="month" defaultValue={month} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /><button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">{tc('search')}</button></form>
            {can(user.role, 'import:run') ? <Link href="/finance/import" className="text-sm font-semibold text-teal-800 hover:underline">{t('import')}</Link> : null}
            <a href={`/${locale}/finance/export?month=${month}`} className="text-sm font-semibold text-teal-800 hover:underline">{t('export')}</a>
          </div>
        </div>
        {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{[t('date'), t('type'), t('amount'), t('mntEquivalent'), t('account'), t('category'), t('trip'), t('counterparty'), t('status')].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50">
            <td className="px-4 py-4 text-slate-600"><Link href={`/finance/${row.id}`} className="hover:text-teal-800 hover:underline">{formatDate(row.date)}</Link></td>
            <td className="px-4 py-4">{t(`types.${row.type}`)}{row.driver ? <span className="block text-xs text-slate-500">{row.driver.name}</span> : null}</td>
            <td className="px-4 py-4 font-medium">{formatMinor(row.amountMinor, row.currency)}</td>
            <td className="px-4 py-4 font-medium">{formatMinor(row.amountMntMinor, 'MNT')}</td>
            <td className="px-4 py-4 text-slate-600">{row.account.name}</td>
            <td className="px-4 py-4 text-slate-600">{row.category?.name ?? '—'}</td>
            <td className="px-4 py-4">{row.trip ? <Link href={`/trips/${row.tripId}`} className="text-teal-800 hover:underline">{row.trip.tripNumber}</Link> : '—'}</td>
            <td className="max-w-40 truncate px-4 py-4 text-slate-600">{row.counterparty ?? '—'}</td>
            <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{row.status === 'ACTIVE' ? t('active') : t('voided')}</span></td>
          </tr>)}</tbody>
        </table></div> : <p className="p-6 text-sm text-slate-500">{tc('empty')}</p>}
      </section>
    </div>
  );
}
