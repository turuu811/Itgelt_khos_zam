'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { login } from './actions';
import type { FormState } from '@/lib/form-state';
import { ErrorBanner, Field, inputClass } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';

export function LoginForm() {
  const t = useTranslations('login');
  const te = useTranslations('errors');
  const [state, action] = useActionState<FormState, FormData>(login, {});

  return (
    <form action={action} className="space-y-5">
      {state.error ? <ErrorBanner>{te(state.error)}</ErrorBanner> : null}

      <Field label={t('identifier')}>
        <input name="identifier" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label={t('password')}>
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>

      <SubmitButton>{t('submit')}</SubmitButton>
    </form>
  );
}
