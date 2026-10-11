import { getTranslations, setRequestLocale } from 'next-intl/server';
import { importTransactions } from '@/features/finance/excel-actions';
import { requirePermission } from '@/lib/guards';
import { PageTitle } from '@/components/ui/page-title';

const RESULT_KEYS = ['forbidden', 'invalid', 'large', 'tooMany', 'imported'] as const;

export default async function FinanceImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ result?: string; imported?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  await requirePermission('import:run');
  setRequestLocale(locale);
  const t = await getTranslations('finance');
  const tc = await getTranslations('common');
  const result = RESULT_KEYS.find((key) => key === query.result);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title={t('importTitle')} description={t('importHint')} />
      {result ? <p role={result === 'imported' ? 'status' : 'alert'} className={`rounded-xl border p-4 text-sm ${result === 'imported' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{result === 'imported' ? t('importSuccess', { count: Math.max(0, Number(query.imported) || 0) }) : t(({ forbidden: 'importForbidden', invalid: 'importInvalid', large: 'importTooLarge', tooMany: 'importTooMany' } as const)[result])}</p> : null}
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <a href={`/${locale}/finance/template`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t('downloadTemplate')}</a>
        <form action={importTransactions} className="space-y-4 border-t border-slate-100 pt-5">
          <label className="block text-sm font-semibold text-slate-700">{t('excelFile')}<input type="file" name="file" accept=".xlsx" required className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-800" /></label>
          <button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">{t('runImport')}</button>
        </form>
        <a href={`/${locale}/finance`} className="block text-sm font-medium text-teal-800 hover:underline">← {tc('back')}</a>
      </section>
    </div>
  );
}
