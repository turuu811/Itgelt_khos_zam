import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/session';
import { LoginForm } from '@/features/auth/login-form';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) return redirect({ href: '/dashboard', locale: await getLocale() });

  const t = await getTranslations('login');

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold">{t('title')}</h1>
        <LoginForm />
      </div>
    </div>
  );
}
