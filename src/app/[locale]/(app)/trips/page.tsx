import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { can } from '@/lib/permissions';
import { formatDate } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { tripTotalsFor } from '@/features/finance/queries';
import { PageTitle } from '@/components/ui/page-title';

export default async function TripsPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, user] = await Promise.all([params, requirePermission('trip:read')]);
  setRequestLocale(locale);
  const [t, tc, ts, trips] = await Promise.all([
    getTranslations('trips'), getTranslations('common'), getTranslations('trips.statuses'),
    db.trip.findMany({
      take: 100, orderBy: { createdAt: 'desc' },
      include: { vehicle: true, driver: true, _count: { select: { cargo: true } } },
    }),
  ]);
  const totals = can(user.role, 'finance:read') ? await tripTotalsFor(trips.map((trip) => trip.id)) : null;

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('listDescription')} action={can(user.role, 'trip:write') ? <Link href="/trips/new" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">{t('new')} +</Link> : undefined} />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {trips.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{[t('number'), t('vehicle'), t('driver'), t('status'), t('departAt'), t('cargoCount'), ...(totals ? [t('profit')] : [])].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{trips.map((trip) => <tr key={trip.id} className="hover:bg-slate-50">
            <td className="px-5 py-4"><Link href={`/trips/${trip.id}`} className="font-semibold text-teal-800 hover:underline">{trip.tripNumber}</Link></td>
            <td className="px-5 py-4">{trip.vehicle.plateNumber}</td><td className="px-5 py-4">{trip.driver.name}</td>
            <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{ts(trip.status)}</span></td>
            <td className="px-5 py-4 text-slate-500">{trip.departAt ? formatDate(trip.departAt) : '—'}</td>
            <td className="px-5 py-4">{trip._count.cargo}</td>
            {totals ? <td className="px-5 py-4 font-medium">{formatMinor(totals.get(trip.id)?.profit ?? 0n, 'MNT')}</td> : null}
          </tr>)}</tbody>
        </table></div> : <p className="p-6 text-sm text-slate-500">{tc('empty')}</p>}
      </section>
    </div>
  );
}
