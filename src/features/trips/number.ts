import { randomInt } from 'node:crypto';
import { todayLocal } from '@/lib/dates';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Жишээ: R-260921-K7M2
export function generateTripNumber(): string {
  const yymmdd = todayLocal().replaceAll('-', '').slice(2);

  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];

  return `R-${yymmdd}-${suffix}`;
}
