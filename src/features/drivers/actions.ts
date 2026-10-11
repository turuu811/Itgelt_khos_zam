'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? '').trim().slice(0, max);

// Жолооч системд нэвтэрдэггүй. Ажилтан бүртгэнэ.
export async function createDriver(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) throw new Error('FORBIDDEN');

  const name = text(formData, 'name', 200);
  if (!name) return;

  const created = await db.driver.create({
    data: { name, phone: text(formData, 'phone', 50) || null, note: text(formData, 'note', 500) || null },
  });
  await writeAudit(db, { userId: user.id, action: 'driver.create', entity: 'Driver', entityId: created.id, after: created });

  revalidatePath('/', 'layout');
}

export async function updateDriver(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'trip:write')) throw new Error('FORBIDDEN');

  const id = String(formData.get('id') ?? '');
  const name = text(formData, 'name', 200);
  if (!id || !name) return;

  const before = await db.driver.findUnique({ where: { id } });
  if (!before) return;

  const after = await db.driver.update({
    where: { id },
    data: {
      name,
      phone: text(formData, 'phone', 50) || null,
      note: text(formData, 'note', 500) || null,
      isActive: formData.get('isActive') === 'on',
    },
  });
  await writeAudit(db, { userId: user.id, action: 'driver.update', entity: 'Driver', entityId: id, before, after });

  revalidatePath('/', 'layout');
}
