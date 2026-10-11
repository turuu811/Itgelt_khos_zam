import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TripForm } from '@/features/trips/trip-form';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { PageTitle } from '@/components/ui/page-title';

export default async function NewTripPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }] = await Promise.all([params, requirePermission('trip:write')]);
  setRequestLocale(locale);
  const [t, vehicles, drivers] = await Promise.all([
    getTranslations('trips'),
    db.vehicle.findMany({ where: { isActive: true }, orderBy: { plateNumber: 'asc' }, select: { id: true, plateNumber: true } }),
    db.driver.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  return <div className="space-y-6"><PageTitle title={t('new')} description={t('formDescription')} />{vehicles.length && drivers.length ? <TripForm vehicles={vehicles} drivers={drivers} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('noResources')}</p>}</div>;
}
