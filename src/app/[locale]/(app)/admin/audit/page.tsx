import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requirePermission } from '@/lib/guards';
import { db } from '@/lib/db';
import { formatDateTime } from '@/lib/dates';
import { PageTitle } from '@/components/ui/page-title';

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  await requirePermission('admin:audit');
  setRequestLocale(locale);
  const [t, tc] = await Promise.all([getTranslations('adminAudit'), getTranslations('common')]);
  const page = Math.max(1, Math.min(10000, Number.parseInt(query.page ?? '1', 10) || 1));
  const [count, logs] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
      take: 50, skip: (page - 1) * 50, orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(count / 50));

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('count', { count })} />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {logs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{[t('date'), t('user'), t('action'), t('entity'), t('before'), t('after')].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{logs.map((log) => <tr key={log.id} className="align-top">
            <td className="whitespace-nowrap px-4 py-4 text-slate-500">{formatDateTime(log.createdAt)}</td><td className="px-4 py-4">{log.user?.name ?? t('system')}</td>
            <td className="px-4 py-4 font-medium">{log.action}</td><td className="px-4 py-4">{log.entity}<span className="block max-w-40 truncate text-xs text-slate-500">{log.entityId}</span></td>
            <td className="max-w-64 px-4 py-4"><pre className="whitespace-pre-wrap break-all text-xs text-slate-600">{log.before ? JSON.stringify(log.before, null, 2) : '—'}</pre></td>
            <td className="max-w-64 px-4 py-4"><pre className="whitespace-pre-wrap break-all text-xs text-slate-600">{log.after ? JSON.stringify(log.after, null, 2) : '—'}</pre></td>
          </tr>)}</tbody>
        </table></div> : <p className="p-6 text-sm text-slate-500">{t('empty')}</p>}
      </section>
      <nav aria-label={t('pagination')} className="flex items-center justify-between">
        {page > 1 ? <a href={`?page=${page - 1}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium">{tc('prev')}</a> : <span />}
        <span className="text-sm text-slate-500">{tc('page', { page, pages })}</span>
        {page < pages ? <a href={`?page=${page + 1}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium">{tc('next')}</a> : <span />}
      </nav>
    </div>
  );
}
