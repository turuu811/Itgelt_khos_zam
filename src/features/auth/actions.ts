'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { verifyCredentials } from '@/lib/auth';
import { createSession, destroySession, getCurrentUser } from '@/lib/session';
import { rateLimit, resetRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request';
import { writeAudit } from '@/lib/audit';
import type { FormState } from '@/lib/form-state';

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = String(formData.get('identifier') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!identifier || !password) return { error: 'required' };

  const key = `login:${await getClientIp()}:${identifier.toLowerCase()}`;
  if (!rateLimit(key, 8, 15 * 60 * 1000).ok) return { error: 'rateLimited' };

  const user = await verifyCredentials(identifier, password);
  if (!user) return { error: 'credentials' };

  // Харилцагчийн портал үе 2-т нээгдэнэ
  if (user.role === 'CUSTOMER') return { error: 'portalSoon' };

  resetRateLimit(key);
  await createSession(user.id);
  await writeAudit(db, { userId: user.id, action: 'auth.login', entity: 'User', entityId: user.id });

  return redirect({ href: '/dashboard', locale: await getLocale() });
}

export async function logout() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await writeAudit(db, { userId: user.id, action: 'auth.logout', entity: 'User', entityId: user.id });
  }
  return redirect({ href: '/login', locale: await getLocale() });
}
