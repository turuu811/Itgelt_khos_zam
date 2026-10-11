import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { formatDate } from '@/lib/dates';
import { PageTitle } from '@/components/ui/page-title';

export default async function CargoPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, user] = await Promise.all([params, requirePermission('cargo:read')]);
  setRequestLocale(locale);
  const t = await getTranslations('cargo');
  const tc = await getTranslations('common');
  const ts = await getTranslations('status');
  const cargo = await db.cargo.findMany({
    take: 100,
    orderBy: { receivedAt: 'desc' },
    select: {
      id: true, trackCode: true, description: true, quantity: true, status: true, receivedAt: true,
      customer: { select: { name: true } },
      trip: { select: { tripNumber: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageTitle
        title={t('title')}
        description={t('listDescription')}
        action={user.role !== 'ACCOUNTANT' && user.role !== 'CUSTOMER' ? (
          <Link href="/cargo/new" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">{t('new')} +</Link>
        ) : undefined}
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {cargo.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>{[t('trackCode'), t('customer'), t('description'), t('status'), t('receivedAt'), t('trip')].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargo.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4"><Link href={`/cargo/${item.id}`} className="font-semibold text-teal-800 hover:underline">{item.trackCode}</Link></td>
                    <td className="px-5 py-4 text-slate-700">{item.customer.name}</td>
                    <td className="max-w-56 truncate px-5 py-4 text-slate-500">{item.description || `${item.quantity} ${t('pieces')}`}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{ts(item.status)}</span></td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(item.receivedAt)}</td>
                    <td className="px-5 py-4 text-slate-500">{item.trip?.tripNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="p-6 text-sm text-slate-500">{tc('empty')}</p>}
      </div>
    </div>
  );
}
