import ExcelJS from 'exceljs';
import { NextResponse, type NextRequest } from 'next/server';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';

const HEADERS = [
  'date', 'type', 'amount', 'currency', 'fxRate', 'method', 'account',
  'category', 'tripNumber', 'trackCode', 'driver', 'counterparty', 'note',
];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'import:run')) return new NextResponse('Forbidden', { status: 403 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transactions');
  sheet.addRow(HEADERS);
  sheet.getRow(1).font = { bold: true };
  sheet.addRow(['2026-01-31', 'INCOME', '100000', 'MNT', '', 'CASH', 'Бэлэн ₮', 'Бусад орлого', '', '', '', 'Харилцагч', 'Жишээ мөрийг импортлохын өмнө устгана']);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns = HEADERS.map((header) => ({ header, width: Math.max(header.length + 3, 16) }));
  const bytes = await workbook.xlsx.writeBuffer();
  const locale = await getLocale();
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="transactions-template-${locale}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
