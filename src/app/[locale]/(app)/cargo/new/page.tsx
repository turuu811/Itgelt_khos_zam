import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CargoForm } from '@/features/cargo/cargo-form';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { PageTitle } from '@/components/ui/page-title';

export default async function NewCargoPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }] = await Promise.all([params, requirePermission('cargo:write')]);
  setRequestLocale(locale);
  const [t, customers] = await Promise.all([
    getTranslations('cargo'),
    db.customer.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t('new')} description={t('formDescription')} />
      {customers.length ? <CargoForm customers={customers} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('noCustomers')}</p>}
    </div>
  );
}
