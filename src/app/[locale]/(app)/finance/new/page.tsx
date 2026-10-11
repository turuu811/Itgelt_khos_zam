import { getTranslations, setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { TransactionForm } from '@/features/finance/transaction-form';
import { todayLocal } from '@/lib/dates';
import { PageTitle } from '@/components/ui/page-title';

export default async function NewTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tripId?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  await requirePermission('finance:write');
  setRequestLocale(locale);
  const [t, accounts, categories, trips, drivers] = await Promise.all([
    getTranslations('finance'),
    db.account.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, currency: true } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, type: true } }),
    db.trip.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, tripNumber: true } }),
    db.driver.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  const tripExists = !query.tripId || trips.some((trip) => trip.id === query.tripId);
  if (!accounts.length) return <div className="space-y-6"><PageTitle title={t('new')} description={t('noAccounts')} /></div>;
  return <div className="space-y-6"><PageTitle title={t('new')} description={t('formDescription')} /><TransactionForm accounts={accounts} categories={categories} trips={trips.map(({ id, tripNumber }) => ({ id, label: tripNumber }))} drivers={drivers} defaultDate={todayLocal()} defaultTripId={tripExists ? query.tripId : undefined} /></div>;
}
