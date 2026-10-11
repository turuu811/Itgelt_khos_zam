import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { can } from '@/lib/permissions';
import { updateDriver } from '@/features/drivers/actions';
import { Field, inputClass, primaryButtonClass } from '@/components/ui/form';
import { formatDate } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { PageTitle } from '@/components/ui/page-title';

export default async function DriverDetailsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const [{ locale, id }, user] = await Promise.all([params, requirePermission('trip:read')]);
  setRequestLocale(locale);
  const [t, tc, driver] = await Promise.all([
    getTranslations('drivers'),
    getTranslations('common'),
    db.driver.findUnique({
      where: { id },
      include: {
        trips: { take: 20, orderBy: { createdAt: 'desc' }, include: { vehicle: { select: { plateNumber: true } }, _count: { select: { cargo: true } } } },
        transactions: { take: 50, where: { type: 'DRIVER_PAYMENT' }, orderBy: { date: 'desc' }, include: { trip: { select: { tripNumber: true } } } },
      },
    }),
  ]);
  if (!driver) notFound();
  const paidTotal = driver.transactions.reduce((sum, tx) => tx.status === 'ACTIVE' ? sum + tx.amountMntMinor : sum, 0n);

  return (
    <div className="space-y-6">
      <PageTitle title={driver.name} description={driver.phone ?? t('detailDescription')} action={<Link href="/drivers" className="text-sm font-semibold text-teal-800 hover:underline">← {t('title')}</Link>} />
      {can(user.role, 'trip:write') ? (
        <form action={updateDriver} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3 md:p-6">
          <input type="hidden" name="id" value={driver.id} />
          <Field label={t('name')}><input name="name" required maxLength={200} defaultValue={driver.name} className={inputClass} /></Field>
          <Field label={t('phone')}><input name="phone" type="tel" maxLength={50} defaultValue={driver.phone ?? ''} className={inputClass} /></Field>
          <Field label={t('note')}><input name="note" maxLength={500} defaultValue={driver.note ?? ''} className={inputClass} /></Field>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" name="isActive" defaultChecked={driver.isActive} />{t('active')}</label>
          <div className="md:col-span-2"><button className={primaryButtonClass}>{t('save')}</button></div>
        </form>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{t('trips')}</p><p className="mt-2 text-2xl font-bold">{driver.trips.length}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{t('paid')}</p><p className="mt-2 text-2xl font-bold">{formatMinor(paidTotal, 'MNT')}</p></article>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-4 font-bold">{t('tripsTitle')}</h2>
        {driver.trips.length ? <ul className="divide-y divide-slate-100">{driver.trips.map((trip) => <li key={trip.id} className="flex flex-wrap justify-between gap-2 px-5 py-4 text-sm"><span className="font-semibold text-slate-900">{trip.tripNumber}</span><span className="text-slate-600">{trip.vehicle.plateNumber} · {trip._count.cargo} {t('tripsCargoSuffix')}</span><span className="text-slate-500">{trip.departAt ? formatDate(trip.departAt) : '—'}</span></li>)}</ul> : <p className="p-5 text-sm text-slate-500">{tc('empty')}</p>}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-4 font-bold">{t('paymentsTitle')}</h2>
        {driver.transactions.length ? <div className="divide-y divide-slate-100">{driver.transactions.map((tx) => <div key={tx.id} className="flex flex-wrap justify-between gap-2 px-5 py-4 text-sm"><span>{formatDate(tx.date)} · {tx.trip?.tripNumber ?? '—'}</span><span className="font-semibold">{formatMinor(tx.amountMntMinor, 'MNT')}</span><span className={tx.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-400'}>{tx.status === 'ACTIVE' ? t('active') : t('voided')}</span></div>)}</div> : <p className="p-5 text-sm text-slate-500">{tc('empty')}</p>}
      </section>
    </div>
  );
}
