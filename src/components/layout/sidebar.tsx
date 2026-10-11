'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { logout } from '@/features/auth/actions';
import { LocaleSwitcher } from './locale-switcher';

export function Sidebar({ items, userName }: { items: { href: string; label: string }[]; userName: string }) {
  const pathname = usePathname();
  const t = useTranslations('common');

  return (
    <aside className="border-b bg-white md:min-h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="px-4 py-3">
        <div className="font-semibold">{t('appName')}</div>
        <div className="text-xs text-slate-500">{userName}</div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? 'whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white'
                  : 'whitespace-nowrap rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 px-4 py-3 md:mt-4">
        <LocaleSwitcher />
        <form action={logout}>
          <button type="submit" className="text-sm text-slate-600 underline">
            {t('logout')}
          </button>
        </form>
      </div>
    </aside>
  );
}
