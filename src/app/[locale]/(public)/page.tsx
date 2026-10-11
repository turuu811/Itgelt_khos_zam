import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const services = [
    { title: t('s1Title'), text: t('s1Text') },
    { title: t('s2Title'), text: t('s2Text') },
    { title: t('s3Title'), text: t('s3Text') },
  ];

  return (
    <div className="space-y-12">
      <section className="rounded-xl bg-slate-900 px-6 py-14 text-white">
        <h1 className="text-3xl font-bold md:text-4xl">{t('heroTitle')}</h1>
        <p className="mt-3 max-w-2xl text-slate-200">{t('heroText')}</p>
        <Link
          href="/quote"
          className="mt-6 inline-block rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
        >
          {t('cta')}
        </Link>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('servicesTitle')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {services.map((s) => (
            <div key={s.title} className="rounded-lg border bg-white p-5">
              <h3 className="font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t('contactTitle')}</h2>
        <p className="text-sm text-slate-700">{t('contactPhone')}</p>
        <p className="text-sm text-slate-700">{t('contactAddress')}</p>
      </section>
    </div>
  );
}
