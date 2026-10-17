import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { can } from '@/lib/permissions';
import { CARGO_STATUSES } from '@/features/cargo/constants';
import { updateCargoStatus } from '@/features/cargo/actions';
import { AttachmentPanel } from '@/features/attachments/attachment-panel';
import { Field, inputClass } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { PageTitle } from '@/components/ui/page-title';
import { formatDateTime } from '@/lib/dates';

export default async function CargoDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ attachment?: string }>;
}) {
  const [{ locale, id }, query, user] = await Promise.all([params, searchParams, requirePermission('cargo:read')]);
  setRequestLocale(locale);
  const [t, tc, ta, ts, cargo] = await Promise.all([
    getTranslations('cargo'), getTranslations('common'), getTranslations('attachments'), getTranslations('status'),
    db.cargo.findUnique({
      where: { id },
      include: {
        customer: true,
        trip: { select: { id: true, tripNumber: true } },
        history: { orderBy: { changedAt: 'desc' }, include: { changedBy: { select: { name: true } } } },
        attachments: { orderBy: { createdAt: 'desc' }, select: { id: true, fileName: true, sizeBytes: true } },
      },
    }),
  ]);
  if (!cargo) notFound();

  return (
    <div className="space-y-6">
      <PageTitle title={cargo.trackCode} description={cargo.customer.name} action={<Link href="/cargo" className="text-sm font-semibold text-teal-800 hover:underline">← {t('title')}</Link>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">{t('details')}</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-500">{t('status')}</dt><dd className="mt-1 font-semibold">{ts(cargo.status)}</dd></div>
            <div><dt className="text-slate-500">{t('receivedAt')}</dt><dd className="mt-1 font-semibold">{formatDateTime(cargo.receivedAt)}</dd></div>
            <div><dt className="text-slate-500">{t('quantity')}</dt><dd className="mt-1 font-semibold">{cargo.quantity}</dd></div>
            <div><dt className="text-slate-500">{t('weightKg')}</dt><dd className="mt-1 font-semibold">{cargo.weightKg?.toString() ?? '—'}</dd></div>
            <div><dt className="text-slate-500">{t('volumeM3')}</dt><dd className="mt-1 font-semibold">{cargo.volumeM3?.toString() ?? '—'}</dd></div>
            <div><dt className="text-slate-500">{t('trip')}</dt><dd className="mt-1 font-semibold">{cargo.trip?.tripNumber ?? '—'}</dd></div>
          </dl>
          {cargo.containerInfo ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><span className="font-semibold">{t('containerInfo')}:</span> {cargo.containerInfo}</p> : null}
          {cargo.note ? <p className="text-sm text-slate-500">{cargo.note}</p> : null}
          {can(user.role, 'cargo:status') ? (
            <form action={updateCargoStatus} className="space-y-4 border-t border-slate-100 pt-5">
              <h3 className="font-semibold text-slate-900">{t('changeStatus')}</h3>
              <input type="hidden" name="cargoId" value={cargo.id} />
              <Field label={t('status')}>
                <select name="status" defaultValue={cargo.status} className={inputClass}>
                  {CARGO_STATUSES.map((status) => <option key={status} value={status}>{ts(status)}</option>)}
                </select>
              </Field>
              <Field label={t('location')}>
                <input name="location" maxLength={200} className={inputClass} />
              </Field>
              <Field label={t('note')}>
                <input name="note" maxLength={500} className={inputClass} />
              </Field>
              <SubmitButton>{t('update')}</SubmitButton>
            </form>
          ) : null}
        </section>
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-950">{t('history')}</h2>
            {cargo.history.length ? (
              <ol className="space-y-4">
                {cargo.history.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-teal-200 pl-4">
                    <p className="text-sm font-semibold text-slate-900">{ts(entry.status)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(entry.changedAt)} · {entry.changedBy.name}</p>
                    {entry.location ? <p className="mt-1 text-xs text-slate-600">{entry.location}</p> : null}
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-slate-500">{tc('empty')}</p>}
          </section>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <AttachmentPanel
              kind="cargo" recordId={cargo.id} attachments={cargo.attachments}
              canUpload={can(user.role, 'cargo:write')} result={query.attachment}
              labels={{ title: ta('title'), upload: ta('upload'), download: ta('download'), empty: ta('empty'), file: ta('file'), uploaded: ta('uploaded'), failed: ta('failed') }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
