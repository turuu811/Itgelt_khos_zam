import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-semibold">
            {t('common.appName')}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/quote">{t('nav.quote')}</Link>
            <Link href="/login">{t('nav.login')}</Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t bg-white py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {t('common.appName')}
      </footer>
    </div>
  );
}
