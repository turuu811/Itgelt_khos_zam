'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { logout } from '@/features/auth/actions';
import { LocaleSwitcher } from './locale-switcher';

export function Sidebar({ items, userName }: { items: { href: string; label: string }[]; userName: string }) {
  const pathname = usePathname();
  const t = useTranslations('common');

  return (
    <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:min-h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
      <div className="border-b border-slate-100 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-teal-700 text-sm font-black text-white">ИХ</span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-slate-900">{t('appName')}</div>
            <div className="mt-0.5 truncate text-xs text-slate-500">{userName}</div>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:overflow-visible">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? 'whitespace-nowrap rounded-xl bg-teal-50 px-3.5 py-2.5 text-sm font-semibold text-teal-800 ring-1 ring-inset ring-teal-100'
                  : 'whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4 md:mt-auto">
        <LocaleSwitcher />
        <form action={logout}>
          <button type="submit" className="text-sm font-medium text-slate-500 transition hover:text-red-700">
            {t('logout')}
          </button>
        </form>
      </div>
    </aside>
  );
}
