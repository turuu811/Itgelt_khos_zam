'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex gap-1 text-sm">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={
            l === locale
              ? 'rounded bg-slate-900 px-2 py-0.5 font-medium text-white'
              : 'rounded px-2 py-0.5 text-slate-600 hover:bg-slate-100'
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
