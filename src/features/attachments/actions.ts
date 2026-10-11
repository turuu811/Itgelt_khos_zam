'use server';

import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;
type AttachmentKind = 'cargo' | 'trip' | 'transaction';

function isSupportedFile(mimeType: string, bytes: Buffer): mimeType is keyof typeof TYPES {
  if (mimeType === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mimeType === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return false;
}

export async function uploadAttachment(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const kind = String(formData.get('kind') ?? '') as AttachmentKind;
  const recordId = String(formData.get('recordId') ?? '');
  const file = formData.get('file');
  const kindConfig = {
    cargo: { permission: 'cargo:write' as const, entity: 'Cargo' },
    trip: { permission: 'trip:write' as const, entity: 'Trip' },
    transaction: { permission: 'finance:write' as const, entity: 'Transaction' },
  }[kind];
  const basePath = kind === 'cargo' ? `/cargo/${recordId}` : kind === 'trip' ? `/trips/${recordId}` : '/finance';
  const back = (result: string) => redirect({ href: `${basePath}?attachment=${result}`, locale });

  if (!user || !kindConfig || !can(user.role, kindConfig.permission) || !recordId) return back('failed');
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_BYTES) return back('failed');
  if (!(file.type in TYPES)) return back('failed');

  const record =
    kind === 'cargo'
      ? await db.cargo.findUnique({ where: { id: recordId }, select: { id: true } })
      : kind === 'trip'
        ? await db.trip.findUnique({ where: { id: recordId }, select: { id: true } })
        : await db.transaction.findUnique({ where: { id: recordId }, select: { id: true } });
  if (!record) return back('failed');

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isSupportedFile(file.type, bytes)) return back('failed');

  const safeName = path
    .basename(file.name.replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 180);
  const fileKey = `${randomUUID()}.${TYPES[file.type]}`;
  const root = path.join(process.cwd(), '.data', 'attachments');
  const destination = path.join(root, fileKey);

  try {
    await mkdir(root, { recursive: true });
    await writeFile(destination, bytes, { flag: 'wx' });
    const attachment = await db.$transaction(async (tx) => {
      const created = await tx.attachment.create({
        data: {
          fileKey,
          fileName: safeName || fileKey,
          mimeType: file.type,
          sizeBytes: bytes.byteLength,
          uploadedById: user.id,
          ...(kind === 'cargo' ? { cargoId: recordId } : {}),
          ...(kind === 'trip' ? { tripId: recordId } : {}),
          ...(kind === 'transaction' ? { transactionId: recordId } : {}),
        },
      });
      await writeAudit(tx, {
        userId: user.id,
        action: 'attachment.create',
        entity: 'Attachment',
        entityId: created.id,
        after: created,
      });
      return created;
    });
    revalidatePath(`/${locale}${basePath}`);
    void attachment;
  } catch {
    await unlink(destination).catch(() => undefined);
    return back('failed');
  }

  return back('uploaded');
}