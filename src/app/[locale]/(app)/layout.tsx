import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/guards';
import { can, type Permission } from '@/lib/permissions';
import { Sidebar } from '@/components/layout/sidebar';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations('nav');

  const all: { href: string; label: string; permission?: Permission }[] = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/cargo', label: t('cargo'), permission: 'cargo:read' },
    { href: '/customers', label: t('customers'), permission: 'customer:read' },
    { href: '/trips', label: t('trips'), permission: 'trip:read' },
    { href: '/vehicles', label: t('vehicles'), permission: 'trip:read' },
    { href: '/git-fees', label: t('gitFees'), permission: 'trip:read' },
    { href: '/drivers', label: t('drivers'), permission: 'trip:read' },
    { href: '/finance', label: t('finance'), permission: 'finance:read' },
    { href: '/reports', label: t('reports'), permission: 'report:read' },
    { href: '/inquiries', label: t('inquiries'), permission: 'inquiry:read' },
    { href: '/admin/users', label: t('users'), permission: 'admin:users' },
    { href: '/admin/audit', label: t('audit'), permission: 'admin:audit' },
  ];
  const items = all
    .filter((i) => !i.permission || can(user.role, i.permission))
    .map(({ href, label }) => ({ href, label }));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar items={items} userName={user.name} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-9">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
