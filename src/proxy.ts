// Next.js 16: middleware.ts-ийг proxy.ts болгон нэрлэсэн.
// Энд зөвхөн хэл болон "cookie байгаа эсэх" гэсэн хурдан шалгалт хийнэ.
// Жинхэнэ эрхийн шалгалт нь хуудас, Server Action бүрт сервер талд хийгдэнэ (lib/guards.ts).
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { SESSION_COOKIE } from './lib/session-constants';

const handleI18n = createMiddleware(routing);

const PROTECTED = /^\/(mn|en)\/(dashboard|cargo|customers|finance|inquiries|trips|vehicles|git-fees|drivers|reports|import|admin)(\/|$)/;

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED.test(pathname) && !request.cookies.get(SESSION_COOKIE)) {
    const locale = pathname.split('/')[1];
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return handleI18n(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
