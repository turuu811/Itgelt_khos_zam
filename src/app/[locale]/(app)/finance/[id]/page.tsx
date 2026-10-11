import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { can } from '@/lib/permissions';
import { voidTransaction } from '@/features/finance/actions';
import { AttachmentPanel } from '@/features/attachments/attachment-panel';
import { Field, inputClass } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { formatDateTime } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { PageTitle } from '@/components/ui/page-title';

export default async function TransactionDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ attachment?: string }>;
}) {
  const [{ locale, id }, query, user] = await Promise.all([params, searchParams, requirePermission('finance:read')]);
  setRequestLocale(locale);
  const [t, tc, ta, transaction] = await Promise.all([
    getTranslations('finance'), getTranslations('common'), getTranslations('attachments'),
    db.transaction.findUnique({
      where: { id },
      include: {
        account: true, category: true, trip: { select: { id: true, tripNumber: true } },
        driver: true, createdBy: { select: { name: true } }, voidedBy: { select: { name: true } },
        attachments: { orderBy: { createdAt: 'desc' }, select: { id: true, fileName: true, sizeBytes: true } },
      },
    }),
  ]);
  if (!transaction) notFound();
  const money = formatMinor(transaction.amountMinor, transaction.currency);

  return (
    <div className="space-y-6">
      <PageTitle title={t(`types.${transaction.type}`)} description={`${formatDateTime(transaction.date)} · ${money}`} action={<Link href="/finance" className="text-sm font-semibold text-teal-800 hover:underline">← {t('title')}</Link>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-950">{t('details')}</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              [t('date'), formatDateTime(transaction.date)],
              [t('amount'), money],
              [t('mntEquivalent'), formatMinor(transaction.amountMntMinor, 'MNT')],
              ...(transaction.fxRate ? [[t('fxRate'), transaction.fxRate.toString()] as [string, string]] : []),
              [t('account'), transaction.account.name],
              [t('category'), transaction.category?.name ?? '—'],
              [t('method'), t(`methods.${transaction.method}`)],
              [t('trip'), transaction.trip?.tripNumber ?? '—'],
              [t('driver'), transaction.driver?.name ?? '—'],
              [t('counterparty'), transaction.counterparty ?? '—'],
              [t('createdBy'), transaction.createdBy.name],
              [t('status'), transaction.status === 'ACTIVE' ? t('active') : t('voided')],
            ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd></div>)}
          </dl>
          {transaction.note ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{transaction.note}</p> : null}
          {transaction.status === 'VOID' ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{transaction.voidReason} · {transaction.voidedBy?.name ?? '—'}</p> : null}
          {transaction.status === 'ACTIVE' && can(user.role, 'finance:void') ? (
            <form action={voidTransaction} className="mt-6 space-y-4 border-t border-slate-100 pt-5">
              <input type="hidden" name="id" value={transaction.id} />
              <Field label={t('voidReason')}><input name="reason" minLength={3} maxLength={500} required className={inputClass} /></Field>
              <SubmitButton>{t('void')}</SubmitButton>
            </form>
          ) : null}
        </section>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <AttachmentPanel kind="transaction" recordId={transaction.id} attachments={transaction.attachments} canUpload={can(user.role, 'finance:write')} result={query.attachment} labels={{ title: ta('title'), upload: ta('upload'), download: ta('download'), empty: ta('empty'), file: ta('file'), uploaded: ta('uploaded'), failed: ta('failed') }} />
        </div>
      </div>
    </div>
  );
}
