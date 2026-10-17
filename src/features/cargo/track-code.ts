import { todayLocal } from '@/lib/dates';

export function generateTrackCode(recentCodes: string[], localDate = todayLocal()): string {
  const prefix = (process.env.TRACK_PREFIX ?? 'IHZ').toUpperCase();
  const yymmdd = localDate.replaceAll('-', '').slice(2);
  const start = `${prefix}-${yymmdd}-`;
  const lastSequence = recentCodes.reduce((maximum, code) => {
    if (!code.startsWith(start)) return maximum;
    const suffix = code.slice(start.length);
    return /^\d{5}$/.test(suffix) ? Math.max(maximum, Number(suffix)) : maximum;
  }, 0);
  const sequence = lastSequence + 1;
  if (sequence > 99_999) throw new Error('TRACK_CODE_SEQUENCE_EXHAUSTED');

  return `${start}${String(sequence).padStart(5, '0')}`;
}
