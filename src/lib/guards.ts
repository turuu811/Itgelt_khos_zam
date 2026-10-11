import 'server-only';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser, type SessionUser } from './session';
import { can, type Permission } from './permissions';

// Хуудас бүрийн эхэнд дуудна. Layout нь навигацийн үед дахин ажилладаггүй тул
// хамгаалалтыг зөвхөн layout-д найдаж болохгүй.
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: '/login', locale: await getLocale() });
  }
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    return redirect({ href: '/dashboard', locale: await getLocale() });
  }
  return user;
}
