import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/session';
import { LoginForm } from '@/features/auth/login-form';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) return redirect({ href: '/dashboard', locale: await getLocale() });

  const t = await getTranslations('login');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#d9f3ef,transparent_55%)] p-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/[0.06]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-teal-700 text-sm font-black text-white">ИХ</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Itgelt Khos Zam</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{t('title')}</h1>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
