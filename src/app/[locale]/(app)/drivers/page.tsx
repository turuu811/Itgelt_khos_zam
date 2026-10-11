import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { createDriver } from '@/features/drivers/actions';
import { Field, inputClass, primaryButtonClass } from '@/components/ui/form';
import { PageTitle } from '@/components/ui/page-title';

export default async function DriversPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, user] = await Promise.all([params, requirePermission('trip:read')]);
  setRequestLocale(locale);
  const [t, tc, drivers] = await Promise.all([
    getTranslations('drivers'),
    getTranslations('common'),
    db.driver.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, phone: true, isActive: true, _count: { select: { trips: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('listDescription')} />
      {user.role === 'ADMIN' || user.role === 'MANAGER' ? (
        <form action={createDriver} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3 md:p-6">
          <h2 className="text-lg font-bold text-slate-950 md:col-span-3">{t('add')}</h2>
          <Field label={t('name')}><input name="name" required maxLength={200} className={inputClass} /></Field>
          <Field label={t('phone')}><input name="phone" type="tel" maxLength={50} className={inputClass} /></Field>
          <Field label={t('note')}><input name="note" maxLength={500} className={inputClass} /></Field>
          <div className="md:col-span-3"><button className={primaryButtonClass}>{tc('add')}</button></div>
        </form>
      ) : null}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {drivers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>{[t('name'), t('phone'), t('trips'), t('active')].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td className="px-5 py-4"><Link href={`/drivers/${driver.id}`} className="font-semibold text-teal-800 hover:underline">{driver.name}</Link></td>
                    <td className="px-5 py-4 text-slate-600">{driver.phone ?? '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{driver._count.trips}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${driver.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{driver.isActive ? t('active') : t('inactive')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="p-6 text-sm text-slate-500">{tc('empty')}</p>}
      </section>
    </div>
  );
}
