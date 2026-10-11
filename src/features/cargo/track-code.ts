import { randomInt } from 'node:crypto';
import { todayLocal } from '@/lib/dates';

// Төөрөгдөх тэмдэгт (0/O, 1/I) байхгүй
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Жишээ: IHZ-260921-K7M2P
export function generateTrackCode(): string {
  const prefix = (process.env.TRACK_PREFIX ?? 'IHZ').toUpperCase();
  const yymmdd = todayLocal().replaceAll('-', '').slice(2);

  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];

  return `${prefix}-${yymmdd}-${suffix}`;
}
