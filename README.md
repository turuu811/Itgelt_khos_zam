# Итгэлт Хос Зам ХХК: ачаа тээврийн систем (үе 1 суурь)

Next.js 16 (App Router) + TypeScript + PostgreSQL (Prisma 7) + next-intl (Монгол/Англи) + Tailwind 4.

## Ажиллуулах

Node.js 20.19 буюу түүнээс дээш хувилбар, PostgreSQL хэрэгтэй. PostgreSQL-ийг Docker Compose-оор эсвэл компьютер дээрээ суулгасан PostgreSQL-ээр ажиллуулж болно.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
npm install
```

`.env` файлаа нээгээд `SESSION_SECRET`, `SEED_ADMIN_PASSWORD`, `DATABASE_URL`-ийг тохируулна. Сессийн түлхүүр үүсгэх жишээ:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

`.env.example`-ийн `DATABASE_URL` нь таны PostgreSQL хэрэглэгч, нууц үг, database нэртэй яг таарах ёстой. Docker Compose ашиглах бол Compose-ийн анхны тохиргоотой тааруулж URL-ээ дараах байдлаар тавина:

```dotenv
DATABASE_URL="postgresql://itgelt:itgelt@localhost:5432/itgelt?schema=public"
```

Дараа нь PostgreSQL-ээ асааж, migration болон эхний админыг бэлтгэнэ:

```powershell
docker compose up -d
npx prisma migrate dev
npm run db:seed
npm run dev
```

`docker compose up -d` нь зөвхөн Docker PostgreSQL ашиглах үед хэрэгтэй. Хэрэв localhost-ийн 5432 порт дээр PostgreSQL аль хэдийн ажиллаж байвал Compose-ийн database түүнтэй давхцаж болно. Тэр тохиолдолд Compose-ийг асаахгүй, эсвэл PostgreSQL-ийн портыг тусад нь тохируулж, `DATABASE_URL`-ээ түүнтэй тааруулна.

Migration-ийн файл `prisma/migrations` дотор аль хэдийн байгаа тул анхны schema-г үүсгэхэд `--name init` дахин нэмэх шаардлагагүй. Schema өөрчлөгдсөний дараа шинэ migration нэртэй үүсгэх бол `npx prisma migrate dev --name <нэр>` хэрэглэнэ.

Нэвтрэх email/утас болон нууц үгийг `.env` дэх `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`-аас авна. Seed нууц үг дор хаяж 10 тэмдэгт байх ёстой. Seed өмнө нь тухайн админыг үүсгэсэн бол дахин ажиллуулахад одоо байгаа нууц үгийг өөрчлөхгүй.

### macOS / Linux

`.env.example`-ийг `.env` болгон хуулж, нууц утгууд болон `DATABASE_URL`-ээ тохируулсны дараа дээрх `npm install`, PostgreSQL, migration, seed, dev командуудыг ажиллуулна.

## Бэлэн болсон зүйл

- **Нүүр хуудас** (MN/EN) ба үнийн санал форм (honeypot, IP-ээр хязгаарлалт)
- **Нэвтрэлт:** bcrypt + jose-ийн HttpOnly cookie. Хүсэлт бүрд хэрэглэгчийг өгөгдлийн сангаас шалгадаг тул идэвхгүй болгосон хэрэглэгч даруй гарна. Нэвтрэх оролдлогыг хязгаарлана.
- **Эрхийн матриц:** `src/lib/permissions.ts` (нэг газар). Хуудас, Server Action бүр сервер талд шалгана.
- **Ачаа:** жагсаалт, хайлт, төлвийн шүүлтүүр, бүртгэл (track код автоматаар), төлөв өөрчлөх, төлөвийн түүх, рейсийн холбоос
- **Рейс:** нээх, жагсаалт (төлвөөр шүүх), дэлгэрэнгүй — ачаа оноох/хасах, бүх ачааны төлвийг нэг дор шинэчлэх, рейсийн санхүү ба ашиг
- **Машин:** бүртгэл, засах, даатгал/үзлэгийн хугацаа дуусахад анхааруулга (улаан/шар өнгөөр)
- **Жолооч:** бүртгэл (системд нэвтэрдэггүй), дэлгэрэнгүйд рейс ба олгосон мөнгөний түүх, нийт дүн
- **Харилцагчид:** жагсаалт, нэмэх
- **Санхүү:** гүйлгээ бүртгэх (₮/¥, ¥-д ханш заавал), рейс ба жолоочтой холбох, сарын нийт (₮-өөр), цуцлах (устгахгүй)
- **Хяналтын лог:** нэвтрэлт, ачаа, рейс, машин, жолооч, харилцагч, гүйлгээний өөрчлөлт бүр `AuditLog`-д бичигдэнэ
- **Хяналтын самбар:** дуусаагүй ачаа, нээлттэй рейс, төлвөөр, сарын орлого/зарлага/ашиг
- **Санхүүгийн тайлан:** `/reports` дээр сарын дүн ба рейс тус бүрийн ашиг
- **Excel:** Санхүүгийн хуудсаас сарын гүйлгээг `.xlsx`-ээр экспортлох, загвар татаж 100 хүртэл гүйлгээ импортлох
- **Баримт хавсаргах:** ачаа, рейс, гүйлгээ дээр PDF/JPG/PNG/WEBP файл хавсаргах; файл нэвтэрсэн эрхтэй хэрэглэгчид л татна
- **Админ:** `/admin/users` дээр хэрэглэгч үүсгэх/идэвхжүүлэх, `/admin/audit` дээр лог шүүх ба харах

Excel импортод данс, ангилал, рейс, ачаа, жолоочийн нэр загвартай яг таарах ёстой. Импорт эхлэхээс өмнө бүх мөр шалгагдана; алдаа байвал гүйлгээний аль нь ч хадгалагдахгүй. Export workbook-ийг импортын загвар болгон ашиглах боломжгүй.

Хавсралт серверийн `.data/attachments` хавтаст локал хадгалагдана. VPS дээр энэ хавтсыг persistent диск болон backup-д заавал оруулна. Өдөр тутмын backup автоматаар тохируулагдаагүй. Vercel зэрэг түр зуурын filesystem-тэй орчинд production ашиглахаас өмнө S3-compatible (R2 гэх мэт) хадгалалт руу шилжүүлэх шаардлагатай.

## Бүтэц

```
src/lib/            money, dates, permissions, session, guards, audit, rate-limit
src/features/       cargo, finance, customers, inquiries, auth, admin, attachments
src/app/[locale]/   (public) нүүр, quote · login · (app) нэвтэрсэн хэсэг
src/app/api/        эрхээр хамгаалсан хавсралт татах endpoint
src/proxy.ts        хэл + cookie байгаа эсэх хурдан шалгалт
messages/           mn.json, en.json
prisma/             schema.prisma, seed.ts
```

## Дараагийн алхам (шаардлагын баримтын дагуу)

1. Нийтийн ачаа хянах, харилцагчийн зөвхөн өөрийн ачааг харуулах нэвтрэлт (Үе 2)
2. Жолоочийн тооцоо хаах, харилцагчийн авлага, касс хаалт (Үе 2)
3. Excel-ээр ачааны импорт/экспорт; одоогоор Excel нь санхүүгийн гүйлгээнд хэрэгжинэ
4. Production-д зориулсан S3-compatible файл хадгалалт

## Анхаарах

- `npm install`, `npm run db:generate`, `npm run typecheck`, `npm run build` амжилттай шалгагдсан. Өгөгдлийн сантай холбоотой ажиллуулахын тулд `.env` дэх `DATABASE_URL` нь хүснэгт үүсгэсэн PostgreSQL руу заасан байх шаардлагатай.
- Нүүр хуудасны утас, хаяг нь placeholder. `messages/mn.json`, `messages/en.json` дотор засна.
- Production дээр **HTTPS заавал** (cookie `secure`). `X-Forwarded-For`-ийг зөвхөн өөрийн nginx/Caddy тохируулдаг байх ёстой.
- Өгөгдлийн сан болон `.data/attachments`-ийн өдөр тутмын backup-ийг сервер дээр тусад нь тохируулна; апп өөрөө backup үүсгэдэггүй.
- Фонт одоогоор системийн фонт. Хятадаас нээгдэхэд саад болохгүйн тулд Google Fonts ашиглаагүй.
- Нэвтрэлтийг Auth.js-ээр биш өөрсдийн энгийн cookie сессээр хийсэн. Auth.js-ийн баг Better Auth-тай нэгдсэн тул шинэ төсөлд түүнд түшиглэхгүй байхыг сонгов. Ирээдүйд шаардлагатай бол `lib/session.ts`, `lib/auth.ts`-ийг солиход хангалттай.
- **Prisma 7** ашигласан: клиент нь `src/generated/prisma`-д үүснэ (`.gitignore`-д орсон), холболтыг `@prisma/adapter-pg`-ээр хийнэ, холболтын мөрийг `prisma.config.ts`-д тохируулсан (`schema.prisma`-д `url` байхгүй). `npm run db:generate`-ийг эхлээд ажиллуулаагүй бол импортууд (`@/generated/prisma/*`) алдаатай харагдана — энэ хэвийн зүйл.
- `npm run db:generate` нь `DATABASE_URL` тохируулаагүй байсан ч клиент үүсгэж чадна; харин migrate, seed, аппын runtime-д зөв database URL шаардлагатай.
- **TypeScript 6.0**, **Next.js 16** (`proxy.ts`, `await params`), **React 19** ашигласан.
