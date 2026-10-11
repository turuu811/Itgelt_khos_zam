'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createTrip } from './actions';
import type { FormState } from '@/lib/form-state';
import { ErrorBanner, Field, inputClass } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';

type Props = {
  vehicles: { id: string; plateNumber: string }[];
  drivers: { id: string; name: string }[];
};

export function TripForm({ vehicles, drivers }: Props) {
  const t = useTranslations('trips');
  const te = useTranslations('errors');
  const [state, action] = useActionState<FormState, FormData>(createTrip, {});

  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const err = (key: string) => (fe[key] ? te(fe[key]) : undefined);

  return (
    <form action={action} className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      {state.error ? <ErrorBanner>{te(state.error)}</ErrorBanner> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('vehicle')} error={err('vehicleId')}>
          <select name="vehicleId" required defaultValue={v.vehicleId ?? ''} className={inputClass}>
            <option value="" disabled>
              {t('selectVehicle')}
            </option>
            {vehicles.map((x) => (
              <option key={x.id} value={x.id}>
                {x.plateNumber}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('driver')} error={err('driverId')}>
          <select name="driverId" required defaultValue={v.driverId ?? ''} className={inputClass}>
            <option value="" disabled>
              {t('selectDriver')}
            </option>
            {drivers.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('departAt')} error={err('departAt')}>
          <input name="departAt" type="date" max={v.arriveAt ?? undefined} defaultValue={v.departAt ?? ''} className={inputClass} />
        </Field>
        <Field label={t('arriveAt')} error={err('arriveAt')}>
          <input name="arriveAt" type="date" min={v.departAt ?? undefined} defaultValue={v.arriveAt ?? ''} className={inputClass} />
        </Field>
      </div>

      <Field label={t('note')} error={err('note')}>
        <textarea name="note" rows={3} maxLength={1000} defaultValue={v.note ?? ''} className={inputClass} />
      </Field>

      <SubmitButton>{t('new')}</SubmitButton>
    </form>
  );
}
