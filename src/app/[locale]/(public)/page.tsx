import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const services = [
    { number: '01', title: t('s1Title'), text: t('s1Text') },
    { number: '02', title: t('s2Title'), text: t('s2Text') },
    { number: '03', title: t('s3Title'), text: t('s3Text') },
    { number: '04', title: t('s4Title'), text: t('s4Text') },
  ];
  const steps = [t('step1'), t('step2'), t('step3'), t('step4')];

  return (
    <div className="space-y-20 pb-10 md:space-y-28">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-white shadow-2xl shadow-slate-900/10 md:px-14 md:py-20">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_10%,rgba(13,148,136,0.36),transparent_48%),linear-gradient(135deg,#0f172a,#102b36_65%,#0f3d42)]" />
        <div aria-hidden="true" className="absolute -right-20 -top-28 -z-10 size-80 rounded-full border border-white/10 md:right-10 md:top-4 md:size-[28rem]" />
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
            <span className="size-1.5 rounded-full bg-teal-300" /> {t('eyebrow')}
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">{t('heroTitle')}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg md:leading-8">{t('heroText')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/quote" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-300">
              {t('cta')} <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <a href="#services" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              {t('servicesTitle')}
            </a>
          </div>
        </div>
        <div className="mt-14 grid max-w-3xl grid-cols-1 gap-3 border-t border-white/15 pt-6 sm:grid-cols-3">
          {[t('routeFact'), t('warehouseFact'), t('trackingFact')].map((fact) => (
            <p key={fact} className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <span className="text-teal-300">✓</span>{fact}
            </p>
          ))}
        </div>
      </section>

      <section id="services" className="scroll-mt-28">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{t('servicesEyebrow')}</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{t('servicesTitle')}</h2>
          <p className="mt-3 leading-7 text-slate-600">{t('servicesIntro')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <article key={service.number} className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/[0.03] transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-900/[0.06] md:p-7">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-teal-50 text-xs font-bold tracking-wide text-teal-800">{service.number}</span>
              <h3 className="mt-5 text-lg font-bold text-slate-950">{service.title}</h3>
              <p className="mt-2 leading-6 text-slate-600">{service.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[0.8fr_1.2fr] md:p-10">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{t('processEyebrow')}</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">{t('processTitle')}</h2>
          <p className="mt-3 leading-7 text-slate-600">{t('processText')}</p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-teal-800 shadow-sm">{index + 1}</span>
              <span className="pt-1 text-sm font-medium leading-5 text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] bg-teal-800 px-6 py-10 text-white md:flex md:items-center md:justify-between md:gap-8 md:px-10 md:py-12">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-200">{t('contactTitle')}</p>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('contactText')}</h2>
          <p className="mt-3 leading-6 text-teal-100">{t('contactHint')}</p>
        </div>
        <Link href="/quote" className="mt-6 inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-teal-900 transition hover:bg-teal-50 md:mt-0">
          {t('cta')} <span aria-hidden="true" className="ml-2">→</span>
        </Link>
      </section>
    </div>
  );
}
