'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createTransaction } from './actions';
import type { FormState } from '@/lib/form-state';
import { ErrorBanner, Field, inputClass } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';

type Currency = 'MNT' | 'CNY';
type TxType = 'INCOME' | 'EXPENSE' | 'DRIVER_PAYMENT';

type Props = {
  accounts: { id: string; name: string; currency: Currency }[];
  categories: { id: string; name: string; type: TxType }[];
  trips: { id: string; label: string }[];
  drivers: { id: string; name: string }[];
  defaultDate: string;
  defaultTripId?: string;
};

const TYPES: TxType[] = ['INCOME', 'EXPENSE', 'DRIVER_PAYMENT'];
const METHODS = ['CASH', 'BANK', 'WECHAT_ALIPAY', 'OTHER'] as const;

export function TransactionForm({ accounts, categories, trips, drivers, defaultDate, defaultTripId }: Props) {
  const t = useTranslations('finance');
  const te = useTranslations('errors');
  const [state, action] = useActionState<FormState, FormData>(createTransaction, {});

  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const err = (key: string) => (fe[key] ? te(fe[key]) : undefined);

  const [type, setType] = useState<TxType>((v.type as TxType) ?? 'EXPENSE');
  const [currency, setCurrency] = useState<Currency>((v.currency as Currency) ?? 'MNT');

  const visibleAccounts = accounts.filter((a) => a.currency === currency);
  const visibleCategories = categories.filter((c) => c.type === type);

  return (
    <form action={action} className="max-w-xl space-y-4">
      {state.error ? <ErrorBanner>{te(state.error)}</ErrorBanner> : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('type')} error={err('type')}>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as TxType)} className={inputClass}>
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`types.${x}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('date')} error={err('date')}>
          <input name="date" type="date" required defaultValue={v.date ?? defaultDate} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label={t('amount')} error={err('amount')}>
            <input name="amount" inputMode="decimal" required defaultValue={v.amount ?? ''} className={inputClass} />
          </Field>
        </div>
        <Field label={t('currency')} error={err('currency')}>
          <select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className={inputClass}
          >
            <option value="MNT">₮ MNT</option>
            <option value="CNY">¥ CNY</option>
          </select>
        </Field>
      </div>

      {currency === 'CNY' ? (
        <Field label={t('fxRate')} error={err('fxRate')}>
          <input name="fxRate" inputMode="decimal" required defaultValue={v.fxRate ?? ''} className={inputClass} />
          <span className="mt-1 block text-xs text-slate-500">{t('fxNote')}</span>
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('account')} error={err('accountId')}>
          <select key={currency} name="accountId" required defaultValue="" className={inputClass}>
            <option value="" disabled />
            {visibleAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('method')} error={err('method')}>
          <select name="method" defaultValue={v.method ?? 'CASH'} className={inputClass}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`methods.${m}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('category')} error={err('categoryId')}>
          <select key={type} name="categoryId" defaultValue="" className={inputClass}>
            <option value="">—</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('trip')} error={err('tripId')}>
          <select name="tripId" defaultValue={v.tripId ?? defaultTripId ?? ''} className={inputClass}>
            <option value="">—</option>
            {trips.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {type === 'DRIVER_PAYMENT' ? (
        <Field label={t('driver')} error={err('driverId')}>
          <select name="driverId" required defaultValue={v.driverId ?? ''} className={inputClass}>
            <option value="" disabled>
              {t('selectDriver')}
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label={t('counterparty')} error={err('counterparty')}>
        <input name="counterparty" defaultValue={v.counterparty ?? ''} className={inputClass} />
      </Field>

      <Field label={t('note')} error={err('note')}>
        <textarea name="note" rows={3} defaultValue={v.note ?? ''} className={inputClass} />
      </Field>

      <SubmitButton>{t('new')}</SubmitButton>
    </form>
  );
}
