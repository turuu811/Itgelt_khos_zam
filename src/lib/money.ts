// Мөнгөний бүх тооцоо ЗӨВХӨН энэ файлаар дамжина.
// Дүнг хамгийн бага нэгжээр (BigInt) хадгална: 1 нэгж = валютын 1/100.
//   12,500.50 ¥  -> 1250050n      1,000,000 ₮ -> 100000000n
// ¥-ийн дүнг ₮ болгоход: ₮-ийн бага нэгж = ¥-ийн бага нэгж × ханш (1 ¥ = ханш ₮).

export type CurrencyCode = 'MNT' | 'CNY';

function parseScaled(input: string, scale: number): bigint {
  const cleaned = input.trim().replace(/[\s,]/g, '');
  const match = /^(\d+)(?:\.(\d+))?$/.exec(cleaned);
  if (!match) throw new Error('INVALID_NUMBER');

  const fraction = match[2] ?? '';
  if (fraction.length > scale) throw new Error('TOO_MANY_DECIMALS');

  return BigInt(match[1]) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0'));
}

/** "12500.50" -> 1250050n (хамгийн ихдээ 2 орны бутархай) */
export function toMinor(input: string): bigint {
  return parseScaled(input, 2);
}

/** Ханшийг 6 орны нарийвчлалтай бүхэл тоо болгоно. */
export function parseFxRate(input: string): bigint {
  const rate = parseScaled(input, 6);
  if (rate <= 0n) throw new Error('INVALID_RATE');
  return rate;
}

export function toMntMinor(amountMinor: bigint, currency: CurrencyCode, fxRate?: string | null): bigint {
  if (currency === 'MNT') return amountMinor;
  if (!fxRate) throw new Error('FX_RATE_REQUIRED');

  const rate = parseFxRate(fxRate);
  // Хагасыг дээш нь дугуйлна
  return (amountMinor * rate + 500000n) / 1000000n;
}

export function formatMinor(minor: bigint, currency: CurrencyCode): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / 100n;
  const fraction = abs % 100n;

  const wholeText = whole.toLocaleString('en-US');
  const fractionText = fraction === 0n && currency === 'MNT' ? '' : `.${fraction.toString().padStart(2, '0')}`;
  const symbol = currency === 'MNT' ? '₮' : '¥';

  return `${negative ? '-' : ''}${symbol}${wholeText}${fractionText}`;
}
