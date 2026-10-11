import 'server-only';
import { headers } from 'next/headers';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';

type Client = PrismaClient | Prisma.TransactionClient;

// BigInt (мөнгөний дүн) JSON-д шууд орохгүй тул тэмдэгт мөр болгоно.
export function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

export async function writeAudit(
  client: Client,
  entry: {
    userId?: string | null;
    action: string;
    entity: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  },
) {
  let ip: string | null = null;
  try {
    ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  } catch {
    ip = null;
  }

  await client.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: toJson(entry.before),
      after: toJson(entry.after),
      ip,
    },
  });
}
