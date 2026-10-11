import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 md:px-6">
          <Link href="/" className="flex items-center gap-3 font-semibold text-slate-950">
            <span className="grid size-10 place-items-center rounded-2xl bg-teal-700 text-sm font-black text-white">ИХ</span>
            <span className="leading-tight">{t('common.appName')}</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm md:gap-5">
            <Link href="/quote" className="hidden font-medium text-slate-600 transition hover:text-teal-800 sm:inline">{t('nav.quote')}</Link>
            <Link href="/login" className="rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white transition hover:bg-teal-800">{t('nav.login')}</Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 md:px-6 md:py-10">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {t('common.appName')} <span className="mx-1 text-slate-300">·</span> {t('nav.quote')}
      </footer>
    </div>
  );
}
