import 'server-only';
import bcrypt from 'bcryptjs';
import { db } from './db';

// Хэрэглэгч олдоогүй үед ч bcrypt-ийг ажиллуулж, хариуны хугацаагаар хэрэглэгч байгаа эсэхийг илчлэхгүй.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export async function verifyCredentials(identifier: string, password: string) {
  const user = await db.user.findFirst({
    where: {
      isActive: true,
      OR: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    },
  });

  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  return ok && user ? user : null;
}
