import { getTranslations, setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { formatDateTime } from '@/lib/dates';
import { PageTitle } from '@/components/ui/page-title';

export default async function InquiriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }] = await Promise.all([params, requirePermission('inquiry:read')]);
  setRequestLocale(locale);
  const [t, tc, inquiries] = await Promise.all([
    getTranslations('inquiries'),
    getTranslations('common'),
    db.inquiry.findMany({ take: 100, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('listDescription')} />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {inquiries.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{[t('date'), t('name'), t('phone'), t('cargoType'), t('weight'), t('message'), t('status')].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{inquiries.map((item) => <tr key={item.id} className="align-top">
            <td className="whitespace-nowrap px-4 py-4 text-slate-500">{formatDateTime(item.createdAt)}</td>
            <td className="px-4 py-4 font-semibold">{item.name}</td>
            <td className="whitespace-nowrap px-4 py-4"><a href={`tel:${item.phone}`} className="text-teal-800 hover:underline">{item.phone}</a></td>
            <td className="px-4 py-4 text-slate-600">{item.cargoType ?? '—'}</td>
            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{item.weightKg ? `${item.weightKg} kg` : '—'}{item.volumeM3 ? ` · ${item.volumeM3} m³` : ''}</td>
            <td className="max-w-64 whitespace-pre-wrap px-4 py-4 text-slate-600">{item.message ?? '—'}</td>
            <td className="px-4 py-4"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">{t(`statuses.${item.status}`)}</span></td>
          </tr>)}</tbody>
        </table></div> : <p className="p-6 text-sm text-slate-500">{tc('empty')}</p>}
      </section>
    </div>
  );
}
