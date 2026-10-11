import 'server-only';
import { headers } from 'next/headers';

// Зөвхөн өөрийн reverse proxy (nginx, Caddy) X-Forwarded-For-ийг тохируулдаг үед найдвартай.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
