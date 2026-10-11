import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import type { Currency, TransactionType } from '../src/generated/prisma/enums';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const categories: { name: string; type: TransactionType }[] = [
  { name: 'Тээврийн орлого', type: 'INCOME' },
  { name: 'Бусад орлого', type: 'INCOME' },
  { name: 'Шатахуун', type: 'EXPENSE' },
  { name: 'Гааль/хил', type: 'EXPENSE' },
  { name: 'Замын хураамж', type: 'EXPENSE' },
  { name: 'Агуулах', type: 'EXPENSE' },
  { name: 'Ачилт-буулгалт', type: 'EXPENSE' },
  { name: 'Засвар', type: 'EXPENSE' },
  { name: 'Бусад зарлага', type: 'EXPENSE' },
  { name: 'Урьдчилгаа', type: 'DRIVER_PAYMENT' },
  { name: 'Урамшуулал', type: 'DRIVER_PAYMENT' },
  { name: 'Замын зардал', type: 'DRIVER_PAYMENT' },
];

const accounts: { name: string; currency: Currency }[] = [
  { name: 'Бэлэн ₮', currency: 'MNT' },
  { name: 'Банкны данс ₮', currency: 'MNT' },
  { name: 'Бэлэн ¥', currency: 'CNY' },
  { name: 'WeChat/Alipay ¥', currency: 'CNY' },
];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) {
    throw new Error('SEED_ADMIN_EMAIL болон SEED_ADMIN_PASSWORD (10+ тэмдэгт) .env-д байх ёстой');
  }

  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Админ',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
    },
  });

  for (const c of categories) {
    await db.category.upsert({
      where: { name_type: { name: c.name, type: c.type } },
      update: {},
      create: c,
    });
  }

  for (const a of accounts) {
    const exists = await db.account.findFirst({ where: { name: a.name } });
    if (!exists) await db.account.create({ data: a });
  }

  console.log('Seed дууслаа. Админ:', email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
