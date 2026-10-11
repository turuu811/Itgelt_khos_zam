'use server';

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

const userSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.union([z.string().trim().email().max(254), z.literal('')]),
    phone: z.string().trim().max(40),
    password: z.string().min(10).max(128),
    role: z.enum(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAREHOUSE']),
  })
  .refine((value) => value.email.length > 0 || value.phone.length > 0);

export async function createUser(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  const locale = await getLocale();
  const finish = (result: string) => redirect({ href: `/admin/users?result=${result}`, locale });
  if (!actor || !can(actor.role, 'admin:users')) return finish('forbidden');

  const parsed = userSchema.safeParse({
    name: formData.get('name'),
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    phone: String(formData.get('phone') ?? '').trim(),
    password: formData.get('password'),
    role: formData.get('role'),
  });
  if (!parsed.success) return finish('invalid');

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          passwordHash,
          role: parsed.data.role,
        },
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
      });
      await writeAudit(tx, {
        userId: actor.id,
        action: 'user.create',
        entity: 'User',
        entityId: created.id,
        after: created,
      });
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return finish('duplicate');
    }
    return finish('invalid');
  }

  revalidatePath('/', 'layout');
  return finish('created');
}

export async function setUserActive(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  const locale = await getLocale();
  const finish = (result: string) => redirect({ href: `/admin/users?result=${result}`, locale });
  if (!actor || !can(actor.role, 'admin:users')) return finish('forbidden');

  const userId = String(formData.get('userId') ?? '');
  const isActive = formData.get('isActive') === 'true';
  if (!userId || (userId === actor.id && !isActive)) return finish('protected');

  try {
    const result = await db.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
      });
      if (!before) return 'invalid';
      if (!isActive && before.role === 'ADMIN') {
        const activeAdmins = await tx.user.count({ where: { role: 'ADMIN', isActive: true } });
        if (activeAdmins <= 1) return 'lastAdmin';
      }
      if (before.isActive === isActive) return 'updated';

      const after = await tx.user.update({
        where: { id: userId },
        data: { isActive },
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
      });
      await writeAudit(tx, {
        userId: actor.id,
        action: isActive ? 'user.activate' : 'user.deactivate',
        entity: 'User',
        entityId: userId,
        before,
        after,
      });
      return 'updated';
    }, { isolationLevel: 'Serializable' });
    revalidatePath('/', 'layout');
    return finish(result);
  } catch {
    return finish('invalid');
  }
}