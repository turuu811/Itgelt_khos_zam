'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createCargo } from './actions';
import type { FormState } from '@/lib/form-state';
import { ErrorBanner, Field, inputClass } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';

export function CargoForm({ customers }: { customers: { id: string; name: string }[] }) {
  const t = useTranslations('cargo');
  const te = useTranslations('errors');
  const [state, action] = useActionState<FormState, FormData>(createCargo, {});

  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const err = (key: string) => (fe[key] ? te(fe[key]) : undefined);

  return (
    <form action={action} className="max-w-xl space-y-4">
      {state.error ? <ErrorBanner>{te(state.error)}</ErrorBanner> : null}

      <Field label={t('customer')} error={err('customerId')}>
        <select name="customerId" required defaultValue={v.customerId ?? ''} className={inputClass}>
          <option value="" disabled>
            {t('selectCustomer')}
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('description')} error={err('description')}>
        <input name="description" defaultValue={v.description ?? ''} className={inputClass} />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t('quantity')} error={err('quantity')}>
          <input name="quantity" type="number" min={1} defaultValue={v.quantity ?? '1'} required className={inputClass} />
        </Field>
        <Field label={t('weightKg')} error={err('weightKg')}>
          <input name="weightKg" inputMode="decimal" defaultValue={v.weightKg ?? ''} className={inputClass} />
        </Field>
        <Field label={t('volumeM3')} error={err('volumeM3')}>
          <input name="volumeM3" inputMode="decimal" defaultValue={v.volumeM3 ?? ''} className={inputClass} />
        </Field>
      </div>

      <Field label={t('note')} error={err('note')}>
        <textarea name="note" rows={3} defaultValue={v.note ?? ''} className={inputClass} />
      </Field>

      <SubmitButton>{t('new')}</SubmitButton>
    </form>
  );
}
