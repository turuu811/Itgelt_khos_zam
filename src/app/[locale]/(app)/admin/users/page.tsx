import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requirePermission } from '@/lib/guards';
import { db } from '@/lib/db';
import { createUser, setUserActive } from '@/features/admin/actions';
import { Field, inputClass, primaryButtonClass } from '@/components/ui/form';
import { PageTitle } from '@/components/ui/page-title';
import { formatDateTime } from '@/lib/dates';

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  await requirePermission('admin:users');
  setRequestLocale(locale);
  const [t, users] = await Promise.all([
    getTranslations('adminUsers'),
    db.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true } }),
  ]);
  const result = query.result && ['created', 'updated', 'duplicate', 'invalid', 'forbidden', 'protected', 'lastAdmin'].includes(query.result) ? query.result : null;

  return (
    <div className="space-y-6">
      <PageTitle title={t('title')} description={t('listDescription')} />
      {result ? <p role={result === 'created' || result === 'updated' ? 'status' : 'alert'} className={`rounded-xl border p-4 text-sm ${result === 'created' || result === 'updated' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{t(`results.${result}`)}</p> : null}
      <form action={createUser} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 md:p-6">
        <h2 className="text-lg font-bold md:col-span-2">{t('createTitle')}</h2>
        <Field label={t('name')}><input name="name" required minLength={2} maxLength={120} className={inputClass} /></Field>
        <Field label={t('role')}><select name="role" required className={inputClass}>{(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAREHOUSE'] as const).map((role) => <option key={role} value={role}>{t(`roles.${role}`)}</option>)}</select></Field>
        <Field label={t('email')}><input name="email" type="email" maxLength={254} autoComplete="email" className={inputClass} /></Field>
        <Field label={t('phone')}><input name="phone" type="tel" maxLength={40} autoComplete="tel" className={inputClass} /></Field>
        <Field label={t('password')} hint={t('passwordHint')}><input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className={inputClass} /></Field>
        <div className="flex items-end"><p className="text-xs text-slate-500">{t('identityHint')}</p></div>
        <div className="md:col-span-2"><button className={primaryButtonClass}>{t('create')}</button></div>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-4 font-bold">{t('listTitle')}</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{[t('name'), t('email'), t('phone'), t('role'), t('status'), t('createdAt'), ''].map((label, i) => <th key={`${label}-${i}`} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id}>
            <td className="px-4 py-4 font-semibold">{user.name}</td><td className="px-4 py-4 text-slate-600">{user.email ?? '—'}</td><td className="px-4 py-4 text-slate-600">{user.phone ?? '—'}</td><td className="px-4 py-4">{t(`roles.${user.role}`)}</td>
            <td className="px-4 py-4">{user.isActive ? t('active') : t('inactive')}</td><td className="px-4 py-4 text-slate-500">{formatDateTime(user.createdAt)}</td>
            <td className="px-4 py-4">{user.role === 'ADMIN' ? null : <form action={setUserActive}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="isActive" value={String(!user.isActive)} /><button className="text-sm font-semibold text-teal-800 hover:underline">{user.isActive ? t('deactivate') : t('activate')}</button></form>}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
}
