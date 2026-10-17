import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Prisma } from '@/generated/prisma/client';
import { PageTitle } from '@/components/ui/page-title';
import { Field, inputClass } from '@/components/ui/form';
import { requirePermission } from '@/lib/guards';
import { can } from '@/lib/permissions';
import { db } from '@/lib/db';
import { currentMonth } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { createGitFee, updateGitFee } from '@/features/git-fees/actions';

const periodPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
const amountInput = (minor: bigint) => `${minor / 100n}.${String(minor % 100n).padStart(2, '0')}`;

export default async function GitFeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; q?: string; customer?: string; vehicle?: string; paid?: string; number?: string; result?: string }>;
}) {
  const [{ locale }, query, user] = await Promise.all([params, searchParams, requirePermission('trip:read')]);
  setRequestLocale(locale);
  const [t, tc, vehicles, customers] = await Promise.all([
    getTranslations('gitFees'),
    getTranslations('common'),
    db.vehicle.findMany({ orderBy: { plateNumber: 'asc' }, select: { id: true, plateNumber: true, isActive: true } }),
    db.customer.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, isActive: true } }),
  ]);

  const period = periodPattern.test(query.period ?? '') ? query.period! : currentMonth();
  const match = periodPattern.exec(period)!;
  const where: Prisma.GitFeeRecordWhereInput = { year: Number(match[1]), month: Number(match[2]) };
  if (query.customer) where.customerId = query.customer;
  if (query.vehicle) where.vehicleId = query.vehicle;
  if (query.paid === 'yes') where.isPaid = true;
  if (query.paid === 'no') where.isPaid = false;
  if (query.number === 'yes') where.numberIssued = true;
  if (query.number === 'no') where.numberIssued = false;
  const search = (query.q ?? '').trim().slice(0, 100);
  if (search) {
    where.OR = [
      { vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const records = await db.gitFeeRecord.findMany({
    where,
    orderBy: [{ vehicle: { plateNumber: 'asc' } }, { customer: { name: 'asc' } }],
    include: { vehicle: { select: { plateNumber: true } }, customer: { select: { name: true } } },
  });
  const totalMinor = records.reduce((sum, record) => sum + record.amountMinor, 0n);
  const paidMinor = records.reduce((sum, record) => sum + (record.isPaid ? record.amountMinor : 0n), 0n);
  const canEdit = can(user.role, 'trip:write');
  const resultMessages: Record<string, string> = {
    created: t('created'), saved: t('saved'), duplicate: t('duplicate'), invalid: t('invalid'), forbidden: t('forbidden'),
  };
  const resultMessage = query.result ? resultMessages[query.result] : undefined;

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('description')} />

      {resultMessage ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{resultMessage}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3" aria-label={t('summary')}>
        <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{t('recordedTotal')}</p><p className="mt-2 text-xl font-bold text-slate-950">{formatMinor(totalMinor, 'MNT')}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{t('paidTotal')}</p><p className="mt-2 text-xl font-bold text-emerald-700">{formatMinor(paidMinor, 'MNT')}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{t('unpaidCount')}</p><p className="mt-2 text-xl font-bold text-amber-700">{records.filter((record) => !record.isPaid).length}</p></article>
      </section>

      {canEdit ? (
        <form action={createGitFee} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
          <h2 className="font-bold text-slate-950 sm:col-span-2 xl:col-span-6">{t('add')}</h2>
          <Field label={t('period')}><input name="period" type="month" required defaultValue={period} className={inputClass} /></Field>
          <Field label={t('vehicle')}>
            <select name="vehicleId" required defaultValue="" className={inputClass}><option value="" disabled>{t('selectVehicle')}</option>{vehicles.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.plateNumber}</option>)}</select>
          </Field>
          <Field label={t('customer')}>
            <select name="customerId" required defaultValue="" className={inputClass}><option value="" disabled>{t('selectCustomer')}</option>{customers.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </Field>
          <Field label={t('amount')}><input name="amount" type="number" required min="0.01" step="0.01" inputMode="decimal" className={inputClass} /></Field>
          <label className="flex min-h-10 items-center gap-2 self-end text-sm font-medium text-slate-700"><input name="isPaid" type="checkbox" className="size-4 accent-teal-700" />{t('paid')}</label>
          <label className="flex min-h-10 items-center gap-2 self-end text-sm font-medium text-slate-700"><input name="numberIssued" type="checkbox" className="size-4 accent-teal-700" />{t('numberIssued')}</label>
          <div className="sm:col-span-2 xl:col-span-6"><button type="submit" className="min-h-10 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">{t('add')}</button></div>
        </form>
      ) : null}

      <section className="space-y-3" aria-label={t('records')}>
        <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
          <Field label={t('period')}><input name="period" type="month" defaultValue={period} className={inputClass} /></Field>
          <Field label={t('vehicle')}><select name="vehicle" defaultValue={query.vehicle ?? ''} className={inputClass}><option value="">{tc('all')}</option>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.plateNumber}</option>)}</select></Field>
          <Field label={t('customer')}><select name="customer" defaultValue={query.customer ?? ''} className={inputClass}><option value="">{tc('all')}</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label={t('paymentStatus')}><select name="paid" defaultValue={query.paid ?? ''} className={inputClass}><option value="">{tc('all')}</option><option value="yes">{t('paid')}</option><option value="no">{t('unpaid')}</option></select></Field>
          <Field label={t('numberStatus')}><select name="number" defaultValue={query.number ?? ''} className={inputClass}><option value="">{tc('all')}</option><option value="yes">{t('numberIssued')}</option><option value="no">{t('numberNotIssued')}</option></select></Field>
          <Field label={t('search')}><input name="q" type="search" defaultValue={search} placeholder={t('searchHint')} className={inputClass} /></Field>
          <div className="sm:col-span-2 xl:col-span-6"><button type="submit" className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{tc('search')}</button></div>
        </form>

        {records.length ? records.map((record) => (
          <article key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
            {canEdit ? (
              <form action={updateGitFee} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                <input type="hidden" name="id" value={record.id} />
                <Field label={t('period')}><input name="period" type="month" required defaultValue={`${record.year}-${String(record.month).padStart(2, '0')}`} className={inputClass} /></Field>
                <Field label={t('vehicle')}><select name="vehicleId" required defaultValue={record.vehicleId} className={inputClass}>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.plateNumber}</option>)}</select></Field>
                <Field label={t('customer')}><select name="customerId" required defaultValue={record.customerId} className={inputClass}>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                <Field label={t('amount')}><input name="amount" type="number" required min="0.01" step="0.01" defaultValue={amountInput(record.amountMinor)} className={inputClass} /></Field>
                <label className="flex min-h-10 items-center gap-2 self-end text-sm font-medium text-slate-700"><input name="isPaid" type="checkbox" defaultChecked={record.isPaid} className="size-4 accent-teal-700" />{t('paid')}</label>
                <label className="flex min-h-10 items-center gap-2 self-end text-sm font-medium text-slate-700"><input name="numberIssued" type="checkbox" defaultChecked={record.numberIssued} className="size-4 accent-teal-700" />{t('numberIssued')}</label>
                <div className="self-end"><button type="submit" className="min-h-10 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">{tc('save')}</button></div>
              </form>
            ) : (
              <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-6">
                <div><dt className="text-slate-500">{t('period')}</dt><dd className="font-semibold">{record.year}-{String(record.month).padStart(2, '0')}</dd></div>
                <div><dt className="text-slate-500">{t('vehicle')}</dt><dd className="font-semibold">{record.vehicle.plateNumber}</dd></div>
                <div><dt className="text-slate-500">{t('customer')}</dt><dd className="font-semibold">{record.customer.name}</dd></div>
                <div><dt className="text-slate-500">{t('amount')}</dt><dd className="font-semibold">{formatMinor(record.amountMinor, 'MNT')}</dd></div>
                <div><dt className="text-slate-500">{t('paymentStatus')}</dt><dd className="font-semibold">{record.isPaid ? t('paid') : t('unpaid')}</dd></div>
                <div><dt className="text-slate-500">{t('numberStatus')}</dt><dd className="font-semibold">{record.numberIssued ? t('numberIssued') : t('numberNotIssued')}</dd></div>
              </dl>
            )}
          </article>
        )) : <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{t('empty')}</p>}
      </section>
    </div>
  );
}
