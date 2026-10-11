import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@/generated/prisma/enums';
import { db } from './db';
import { SESSION_COOKIE } from './session-constants';

const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 цаг

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  customerId: string | null;
};

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters long');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getKey());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Cookie-д зөвхөн хэрэглэгчийн ID байна. Эрх, идэвхтэй эсэхийг хүсэлт бүрд өгөгдлийн сангаас
// авдаг тул хэрэглэгчийг идэвхгүй болгох, эрхийг өөрчлөх нь даруй хүчинтэй болно.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const key = getKey();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (!payload.sub) return null;

    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, role: true, isActive: true, customerId: true },
    });
    if (!user || !user.isActive) return null;

    return { id: user.id, name: user.name, role: user.role, customerId: user.customerId };
  } catch {
    return null;
  }
});
