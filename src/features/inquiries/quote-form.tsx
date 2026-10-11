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
    return (
      <div role="status" className="flex min-h-40 items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-sm">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-lg font-bold text-emerald-700">✓</span>
        <div>
          <h2 className="font-bold">{t('sentTitle')}</h2>
          <p className="mt-1 text-sm leading-6 text-emerald-800">{t('thanks')}</p>
        </div>
      </div>
    );
  }

  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const err = (key: string) => (fe[key] ? te(fe[key]) : undefined);

  return (
    <form action={action} className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      {state.error ? <ErrorBanner>{te(state.error)}</ErrorBanner> : null}

      {/* Робот бөглөвөл хүсэлтийг үл тоомсорлоно. Хүнд харагдахгүй. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <Field label={t('name')} error={err('name')}>
        <input name="name" autoComplete="name" maxLength={100} required defaultValue={v.name ?? ''} className={inputClass} />
      </Field>
      <Field label={t('phone')} error={err('phone')}>
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" minLength={6} maxLength={30} required defaultValue={v.phone ?? ''} className={inputClass} />
      </Field>
      <Field label={t('cargoType')} error={err('cargoType')}>
        <input name="cargoType" maxLength={200} defaultValue={v.cargoType ?? ''} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('weightKg')} error={err('weightKg')}>
          <input name="weightKg" type="number" min={0} max={999999999.999} step="0.001" inputMode="decimal" defaultValue={v.weightKg ?? ''} className={inputClass} />
        </Field>
        <Field label={t('volumeM3')} error={err('volumeM3')}>
          <input name="volumeM3" type="number" min={0} max={999999999.999} step="0.001" inputMode="decimal" defaultValue={v.volumeM3 ?? ''} className={inputClass} />
        </Field>
      </div>
      <Field label={t('message')} error={err('message')}>
        <textarea name="message" rows={4} maxLength={2000} defaultValue={v.message ?? ''} className={inputClass} />
      </Field>

      <SubmitButton>{t('submit')}</SubmitButton>
    </form>
  );
}
