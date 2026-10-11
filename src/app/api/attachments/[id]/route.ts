import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const attachment = await db.attachment.findUnique({
    where: { id },
    select: { fileKey: true, fileName: true, mimeType: true, cargoId: true, tripId: true, transactionId: true },
  });
  if (!attachment) return new NextResponse('Not found', { status: 404 });

  const allowed = attachment.cargoId
    ? can(user.role, 'cargo:read')
    : attachment.tripId
      ? can(user.role, 'trip:read')
      : can(user.role, 'finance:read');
  if (!allowed) return new NextResponse('Forbidden', { status: 403 });

  const safeKey = path.basename(attachment.fileKey);
  if (safeKey !== attachment.fileKey) return new NextResponse('Not found', { status: 404 });
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(process.cwd(), '.data', 'attachments', safeKey));
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return new NextResponse('Not found', { status: 404 });
    }
    throw error;
  }

  const filename = encodeURIComponent(attachment.fileName);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
