import { getTranslations, setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/guards';
import { VehicleForm } from '@/features/vehicles/vehicle-form';
import { updateVehicle } from '@/features/vehicles/actions';
import { can } from '@/lib/permissions';
import { formatDate } from '@/lib/dates';
import { PageTitle } from '@/components/ui/page-title';
import { inputClass } from '@/components/ui/form';

export default async function VehiclesPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, user] = await Promise.all([params, requirePermission('trip:read')]);
  setRequestLocale(locale);
  const [t, tc, vehicles] = await Promise.all([
    getTranslations('vehicles'),
    getTranslations('common'),
    db.vehicle.findMany({ orderBy: [{ isActive: 'desc' }, { plateNumber: 'asc' }], include: { _count: { select: { trips: true } } } }),
  ]);
  const today = new Date();
  const expiresSoon = new Date(today);
  expiresSoon.setDate(today.getDate() + 30);
  const statusLabel = (date: Date | null) => {
    if (!date) return '—';
    if (date < today) return t('expired');
    if (date <= expiresSoon) return t('soon');
    return formatDate(date);
  };
  const canEdit = can(user.role, 'trip:write');

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('listDescription')} />
      {user.role === 'ADMIN' || user.role === 'MANAGER' ? <VehicleForm /> : null}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {vehicles.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>{[t('plate'), t('type'), t('capacityKg'), t('lastOilChangeAt'), t('insuranceExpiresAt'), t('inspectionExpiresAt'), t('tripCount')].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((vehicle) => {
                  const insuranceExpired = vehicle.insuranceExpiresAt && vehicle.insuranceExpiresAt < today;
                  const inspectionExpired = vehicle.inspectionExpiresAt && vehicle.inspectionExpiresAt < today;
                  return (
                    <tr key={vehicle.id}>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {vehicle.plateNumber}
                        {canEdit ? <form id={`vehicle-${vehicle.id}`} action={updateVehicle}><input type="hidden" name="id" value={vehicle.id} /></form> : null}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{vehicle.type ?? '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{vehicle.capacityKg ?? '—'}</td>
                      <td className="px-5 py-4">
                        {canEdit ? <input form={`vehicle-${vehicle.id}`} aria-label={t('lastOilChangeAt')} name="lastOilChangeAt" type="date" defaultValue={vehicle.lastOilChangeAt ? formatDate(vehicle.lastOilChangeAt) : ''} className={inputClass} /> : <span className="text-slate-600">{vehicle.lastOilChangeAt ? formatDate(vehicle.lastOilChangeAt) : '—'}</span>}
                      </td>
                      <td className={`px-5 py-4 ${insuranceExpired ? 'font-semibold text-red-700' : 'text-slate-600'}`}>
                        {canEdit ? <input form={`vehicle-${vehicle.id}`} aria-label={t('insuranceExpiresAt')} name="insuranceExpiresAt" type="date" defaultValue={vehicle.insuranceExpiresAt ? formatDate(vehicle.insuranceExpiresAt) : ''} className={inputClass} /> : statusLabel(vehicle.insuranceExpiresAt)}
                      </td>
                      <td className={`px-5 py-4 ${inspectionExpired ? 'font-semibold text-red-700' : 'text-slate-600'}`}>
                        {canEdit ? <input form={`vehicle-${vehicle.id}`} aria-label={t('inspectionExpiresAt')} name="inspectionExpiresAt" type="date" defaultValue={vehicle.inspectionExpiresAt ? formatDate(vehicle.inspectionExpiresAt) : ''} className={inputClass} /> : statusLabel(vehicle.inspectionExpiresAt)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {vehicle._count.trips}
                        {canEdit ? <div className="mt-2"><button form={`vehicle-${vehicle.id}`} type="submit" className="min-h-10 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">{tc('save')}</button></div> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="p-6 text-sm text-slate-500">{tc('empty')}</p>}
      </section>
    </div>
  );
}
