import { getTranslations, setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { createCustomer, toggleCustomerStatus } from '@/features/customers/actions';
import { Field, inputClass, primaryButtonClass } from '@/components/ui/form';
import { PageTitle } from '@/components/ui/page-title';

export default async function CustomersPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, user] = await Promise.all([params, requirePermission('customer:read')]);
  setRequestLocale(locale);
  const [t, tc, customers] = await Promise.all([
    getTranslations('customers'),
    getTranslations('common'),
    db.customer.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, contactPerson: true, phone: true, isActive: true, _count: { select: { cargo: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('listDescription')} />
      {user.role === 'ADMIN' || user.role === 'MANAGER' ? (
        <form action={createCustomer} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 md:p-6">
          <h2 className="text-lg font-bold text-slate-950 md:col-span-2">{t('add')}</h2>
          <Field label={t('name')}><input name="name" required maxLength={200} className={inputClass} /></Field>
          <Field label={t('contactPerson')}><input name="contactPerson" maxLength={200} className={inputClass} /></Field>
          <Field label={t('phone')}><input name="phone" type="tel" maxLength={50} className={inputClass} /></Field>
          <Field label={t('note')}><input name="note" maxLength={500} className={inputClass} /></Field>
          <div className="md:col-span-2"><button className={primaryButtonClass}>{tc('add')}</button></div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {customers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>{[t('name'), t('contactPerson'), t('phone'), t('cargoCount'), t('status')].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-5 py-4 font-semibold text-slate-900">{customer.name}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.contactPerson ?? '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.phone ?? '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{customer._count.cargo}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${customer.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{customer.isActive ? t('active') : t('inactive')}</span>
                        {user.role === 'ADMIN' || user.role === 'MANAGER' ? (
                          <form action={toggleCustomerStatus}>
                            <input type="hidden" name="customerId" value={customer.id} />
                            <button type="submit" className="text-xs font-semibold text-teal-800 hover:underline">{customer.isActive ? t('deactivate') : t('activate')}</button>
                          </form>
                        ) : null}
                      </div>
                    </td>
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
