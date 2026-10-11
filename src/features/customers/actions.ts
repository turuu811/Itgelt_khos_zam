'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? '').trim().slice(0, max);

export async function createCustomer(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'customer:write')) throw new Error('FORBIDDEN');

  const name = text(formData, 'name', 200);
  if (!name) return;

  const created = await db.customer.create({
    data: {
      name,
      contactPerson: text(formData, 'contactPerson', 200) || null,
      phone: text(formData, 'phone', 50) || null,
      note: text(formData, 'note', 500) || null,
    },
  });
  await writeAudit(db, { userId: user.id, action: 'customer.create', entity: 'Customer', entityId: created.id, after: created });

  revalidatePath('/', 'layout');
}
