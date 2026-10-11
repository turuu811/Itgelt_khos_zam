import { getTranslations, setRequestLocale } from 'next-intl/server';
import { QuoteForm } from '@/features/inquiries/quote-form';

export default async function QuotePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('quote');

  return (
    <div className="mx-auto grid max-w-5xl gap-8 py-4 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
      <section className="pt-2">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{t('eyebrow')}</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{t('title')}</h1>
        <p className="mt-4 leading-7 text-slate-600">{t('intro')}</p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">{t('prepareTitle')}</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            {[t('prepareCargo'), t('prepareSize'), t('prepareContact')].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-0.5 text-teal-700">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">{t('routeNote')}</p>
      </section>

      <QuoteForm />
    </div>
  );
}
