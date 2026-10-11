'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createVehicle } from './actions';
import type { FormState } from '@/lib/form-state';
import { ErrorBanner, Field, inputClass } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';

export function VehicleForm() {
  const t = useTranslations('vehicles');
  const te = useTranslations('errors');
  const [state, action] = useActionState<FormState, FormData>(createVehicle, {});

  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const err = (key: string) => (fe[key] ? te(fe[key]) : undefined);

  return (
    <form action={action} className="grid max-w-xl gap-3 rounded-lg border bg-white p-4">
      <h2 className="font-medium">{t('add')}</h2>
      {state.error ? <ErrorBanner>{te(state.error)}</ErrorBanner> : null}

      <div className="grid grid-cols-3 gap-3">
        <Field label={t('plate')} error={err('plateNumber')}>
          <input name="plateNumber" required defaultValue={v.plateNumber ?? ''} className={inputClass} />
        </Field>
        <Field label={t('type')} error={err('type')}>
          <input name="type" defaultValue={v.type ?? ''} className={inputClass} />
        </Field>
        <Field label={t('capacityKg')} error={err('capacityKg')}>
          <input name="capacityKg" inputMode="numeric" defaultValue={v.capacityKg ?? ''} className={inputClass} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('insuranceExpiresAt')} error={err('insuranceExpiresAt')}>
          <input name="insuranceExpiresAt" type="date" defaultValue={v.insuranceExpiresAt ?? ''} className={inputClass} />
        </Field>
        <Field label={t('inspectionExpiresAt')} error={err('inspectionExpiresAt')}>
          <input name="inspectionExpiresAt" type="date" defaultValue={v.inspectionExpiresAt ?? ''} className={inputClass} />
        </Field>
      </div>

      <div>
        <SubmitButton>{t('add')}</SubmitButton>
      </div>
    </form>
  );
}
