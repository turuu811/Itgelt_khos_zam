import { cloneElement, isValidElement, useId, type ReactNode } from 'react';

export const inputClass =
  'block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/[0.03] transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-500/10 disabled:cursor-not-allowed disabled:bg-slate-50';

export const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 active:translate-y-px disabled:cursor-wait disabled:opacity-60';

export const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50';

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const errorId = useId();
  const control = isValidElement<{ 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(children)
    ? cloneElement(children, {
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })
    : children;

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold text-slate-700">{label}</span>
      {control}
      {hint && !error ? <span className="mt-1.5 block text-xs leading-5 text-slate-500">{hint}</span> : null}
      {error ? <span id={errorId} role="alert" className="mt-1.5 block text-xs font-medium text-red-700">{error}</span> : null}
    </label>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {children}
    </p>
  );
}
