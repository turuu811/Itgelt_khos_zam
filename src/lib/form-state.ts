import type { ZodError } from 'zod';

// useActionState-тэй ашиглах формын төлөв. Алдааны утга нь messages/*.json дахь "errors" түлхүүр.
export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in out)) out[key] = issue.message === 'required' ? 'required' : 'invalid';
  }
  return out;
}

// Алдаа гарвал талбаруудыг дахин бөглөхөд ашиглана (нууц үгийг оруулахгүй).
export function valuesFrom(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && key !== 'password') out[key] = value;
  }
  return out;
}
