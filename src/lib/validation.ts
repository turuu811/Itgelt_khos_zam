import { z } from 'zod';

/** Хоосон эсвэл 3 орны бутархайтай эерэг тоо (жин, эзлэхүүн) */
export const optDecimal = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,3})?$/, 'invalid')
  .or(z.literal(''));

export const optText = (max: number) => z.string().trim().max(max, 'invalid').optional();
