// Улаанбаатар, Эрээн хоёр хоёулаа UTC+8. Огноог энэ цагийн бүсээр тооцно.
export const TZ = 'Asia/Ulaanbaatar';

function parts(date: Date) {
  const list = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type: string) => list.find((p) => p.type === type)!.value;
  return { year: pick('year'), month: pick('month'), day: pick('day') };
}

/** "2026-09" */
export function currentMonth(now: Date = new Date()): string {
  const p = parts(now);
  return `${p.year}-${p.month}`;
}

/** "2026-09-21" */
export function todayLocal(now: Date = new Date()): string {
  const p = parts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

export function monthRange(month: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const mon = Number(match[2]);
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMonth = mon === 12 ? 1 : mon + 1;

  return {
    start: new Date(`${match[1]}-${match[2]}-01T00:00:00+08:00`),
    end: new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+08:00`),
  };
}

/** "2026-09-21" -> тухайн өдрийн 00:00 (UTC+8) */
export function localDateToDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
