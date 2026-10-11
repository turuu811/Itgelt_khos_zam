'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { primaryButtonClass } from './form';

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryButtonClass}>
      {children}
    </button>
  );
}
