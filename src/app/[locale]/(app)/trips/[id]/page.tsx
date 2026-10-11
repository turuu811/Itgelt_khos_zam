import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { can } from '@/lib/permissions';
import { TRIP_STATUSES } from '@/features/trips/constants';
import { assignCargoToTrip, bulkUpdateCargoStatus, unassignCargoFromTrip, updateTripStatus } from '@/features/trips/actions';
import { CARGO_STATUSES, CLOSED_STATUSES } from '@/features/cargo/constants';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { tripTotalsFor } from '@/features/finance/queries';
import { AttachmentPanel } from '@/features/attachments/attachment-panel';
import { PageTitle } from '@/components/ui/page-title';
import { Field, inputClass, secondaryButtonClass } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';

export default async function TripDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ attachment?: string }>;
}) {
  const [{ locale, id }, query, user] = await Promise.all([params, searchParams, requirePermission('trip:read')]);
  setRequestLocale(locale);
  const [t, tc, ta, ts, cs, trip] = await Promise.all([
    getTranslations('trips'), getTranslations('common'), getTranslations('attachments'), getTranslations('trips.statuses'), getTranslations('status'),
    db.trip.findUnique({
      where: { id },
      include: {
        vehicle: true, driver: true,
        cargo: { orderBy: { receivedAt: 'desc' }, include: { customer: { select: { name: true } } } },
        transactions: { where: { status: 'ACTIVE' }, orderBy: { date: 'desc' }, include: { category: true } },
        attachments: { orderBy: { createdAt: 'desc' }, select: { id: true, fileName: true, sizeBytes: true } },
      },
    }),
  ]);
  if (!trip) notFound();

  const [totals, freeCargo] = await Promise.all([
    can(user.role, 'finance:read') ? tripTotalsFor([trip.id]) : Promise.resolve(null),
    can(user.role, 'cargo:write') && can(user.role, 'trip:write') && trip.status !== 'CLOSED'
      ? db.cargo.findMany({
          where: { tripId: null, status: { notIn: CLOSED_STATUSES } },
          take: 200, orderBy: { receivedAt: 'desc' },
          select: { id: true, trackCode: true, customer: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);
  const canEdit = can(user.role, 'trip:write');
  const canEditCargo = canEdit && can(user.role, 'cargo:write');
  const canReadFinance = can(user.role, 'finance:read');
  const tripTotal = totals?.get(trip.id);

  return (
    <div className="space-y-6">
      <PageTitle title={trip.tripNumber} description={`${trip.vehicle.plateNumber} · ${trip.driver.name}`} action={<Link href="/trips" className="text-sm font-semibold text-teal-800 hover:underline">← {t('title')}</Link>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{t('status')}</p><p className="mt-2 font-semibold">{ts(trip.status)}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{t('departAt')}</p><p className="mt-2 font-semibold">{trip.departAt ? formatDate(trip.departAt) : '—'}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{t('arriveAt')}</p><p className="mt-2 font-semibold">{trip.arriveAt ? formatDate(trip.arriveAt) : '—'}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{t('cargoCount')}</p><p className="mt-2 font-semibold">{trip.cargo.length}</p></article>
      </section>

      {canEdit ? <form action={updateTripStatus} className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input type="hidden" name="tripId" value={trip.id} />
        <Field label={t('changeStatus')}><select name="status" defaultValue={trip.status} className={inputClass}>{TRIP_STATUSES.map((status) => <option key={status} value={status}>{ts(status)}</option>)}</select></Field>
        <SubmitButton>{t('update')}</SubmitButton>
      </form> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="font-bold">{t('cargoTitle')}</h2><span className="text-sm text-slate-500">{trip.cargo.length}</span></div>
        {trip.cargo.length ? <div className="divide-y divide-slate-100">{trip.cargo.map((cargo) => <div key={cargo.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div><p className="font-semibold text-slate-900">{cargo.trackCode}</p><p className="mt-1 text-xs text-slate-500">{cargo.customer.name} · {cs(cargo.status)} · {formatDate(cargo.receivedAt)}</p></div>
          {canEditCargo && trip.status !== 'CLOSED' ? <form action={unassignCargoFromTrip}><input type="hidden" name="tripId" value={trip.id} /><input type="hidden" name="cargoId" value={cargo.id} /><button className={secondaryButtonClass}>{t('unassign')}</button></form> : null}
        </div>)}</div> : <p className="p-5 text-sm text-slate-500">{tc('empty')}</p>}
        {canEditCargo && trip.status !== 'CLOSED' ? <div className="grid gap-5 border-t border-slate-100 p-5 lg:grid-cols-2">
          <form action={assignCargoToTrip} className="flex items-end gap-3"><input type="hidden" name="tripId" value={trip.id} /><Field label={t('assignCargo')}><select name="cargoId" required defaultValue="" className={inputClass}><option value="" disabled>{t('selectCargo')}</option>{freeCargo.map((cargo) => <option key={cargo.id} value={cargo.id}>{cargo.trackCode} · {cargo.customer.name}</option>)}</select></Field><SubmitButton>{t('assignCargo')}</SubmitButton></form>
          {can(user.role, 'cargo:status') && trip.cargo.length ? <form action={bulkUpdateCargoStatus} className="grid gap-3 sm:grid-cols-3"><input type="hidden" name="tripId" value={trip.id} /><Field label={t('bulkTitle')}><select name="status" required className={inputClass}>{CARGO_STATUSES.map((status) => <option key={status} value={status}>{cs(status)}</option>)}</select></Field><Field label={t('location')}><input name="location" maxLength={200} className={inputClass} /></Field><div className="flex items-end"><SubmitButton>{t('update')}</SubmitButton></div></form> : null}
        </div> : null}
      </section>

      {canReadFinance ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="font-bold">{t('financeTitle')}</h2><div className="flex items-center gap-4"><span className="text-sm font-semibold">{t('profit')}: {formatMinor(tripTotal?.profit ?? 0n, 'MNT')}</span>{can(user.role, 'finance:write') ? <Link href={`/finance/new?tripId=${trip.id}`} className="text-sm font-semibold text-teal-800 hover:underline">{t('addTransaction')} +</Link> : null}</div></div>
        {trip.transactions.length ? <div className="divide-y divide-slate-100">{trip.transactions.map((tx) => <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"><span>{formatDateTime(tx.date)} · {tx.category?.name ?? t(`transactionTypes.${tx.type}`)}</span><span className="font-semibold">{formatMinor(tx.amountMntMinor, 'MNT')}</span></div>)}</div> : <p className="p-5 text-sm text-slate-500">{t('noTransactions')}</p>}
      </section> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><AttachmentPanel kind="trip" recordId={trip.id} attachments={trip.attachments} canUpload={canEdit} result={query.attachment} labels={{ title: ta('title'), upload: ta('upload'), download: ta('download'), empty: ta('empty'), file: ta('file'), uploaded: ta('uploaded'), failed: ta('failed') }} /></div>
    </div>
  );
}
