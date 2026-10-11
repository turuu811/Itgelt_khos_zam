'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request';
import { fieldErrorsFrom, valuesFrom, type FormState } from '@/lib/form-state';
import { optDecimal, optText } from '@/lib/validation';

const schema = z.object({
  name: z.string().trim().min(1, 'required').max(100, 'invalid'),
  phone: z.string().trim().min(6, 'invalid').max(30, 'invalid'),
  cargoType: optText(200),
  weightKg: optDecimal,
  volumeM3: optDecimal,
  message: optText(2000),
});

// Нийтэд нээлттэй тул: honeypot талбар + IP-ээр хязгаарлалт
export async function submitInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get('website') ?? '') !== '') return { ok: true };

  const ip = await getClientIp();
  if (!rateLimit(`inquiry:${ip}`, 5, 60 * 60 * 1000).ok) return { error: 'rateLimited' };

  const values = valuesFrom(formData);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: 'validation', fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const d = parsed.data;

  await db.inquiry.create({
    data: {
      name: d.name,
      phone: d.phone,
      cargoType: d.cargoType || null,
      weightKg: d.weightKg || null,
      volumeM3: d.volumeM3 || null,
      message: d.message || null,
    },
  });

  return { ok: true };
}
