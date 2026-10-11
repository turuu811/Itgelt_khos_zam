'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { submitInquiry } from './actions';
import type { FormState } from '@/lib/form-state';
import { ErrorBanner, Field, inputClass } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';

export function QuoteForm() {
  const t = useTranslations('quote');
  const te = useTranslations('errors');
  const [state, action] = useActionState<FormState, FormData>(submitInquiry, {});

  if (state.ok) {
    return <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-800">{t('thanks')}</p>;
  }

  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const err = (key: string) => (fe[key] ? te(fe[key]) : undefined);

  return (
    <form action={action} className="max-w-xl space-y-4">
      {state.error ? <ErrorBanner>{te(state.error)}</ErrorBanner> : null}

      {/* Робот бөглөвөл хүсэлтийг үл тоомсорлоно. Хүнд харагдахгүй. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <Field label={t('name')} error={err('name')}>
        <input name="name" required defaultValue={v.name ?? ''} className={inputClass} />
      </Field>
      <Field label={t('phone')} error={err('phone')}>
        <input name="phone" inputMode="tel" required defaultValue={v.phone ?? ''} className={inputClass} />
      </Field>
      <Field label={t('cargoType')} error={err('cargoType')}>
        <input name="cargoType" defaultValue={v.cargoType ?? ''} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('weightKg')} error={err('weightKg')}>
          <input name="weightKg" inputMode="decimal" defaultValue={v.weightKg ?? ''} className={inputClass} />
        </Field>
        <Field label={t('volumeM3')} error={err('volumeM3')}>
          <input name="volumeM3" inputMode="decimal" defaultValue={v.volumeM3 ?? ''} className={inputClass} />
        </Field>
      </div>
      <Field label={t('message')} error={err('message')}>
        <textarea name="message" rows={4} defaultValue={v.message ?? ''} className={inputClass} />
      </Field>

      <SubmitButton>{t('submit')}</SubmitButton>
    </form>
  );
}
