import ExcelJS from 'exceljs';
import { NextResponse, type NextRequest } from 'next/server';
import { getLocale } from 'next-intl/server';
import { requirePermission } from '@/lib/guards';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/dates';
import { formatMinor } from '@/lib/money';

export async function GET(request: NextRequest) {
  await requirePermission('finance:read');
  const month = request.nextUrl.searchParams.get('month') ?? '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transactions');
  sheet.columns = [
    { header: 'date', key: 'date', width: 14 },
    { header: 'type', key: 'type', width: 20 },
    { header: 'amount', key: 'amount', width: 18 },
    { header: 'currency', key: 'currency', width: 12 },
    { header: 'fxRate', key: 'fxRate', width: 14 },
    { header: 'amountMNT', key: 'amountMNT', width: 18 },
    { header: 'method', key: 'method', width: 18 },
    { header: 'account', key: 'account', width: 22 },
    { header: 'category', key: 'category', width: 24 },
    { header: 'tripNumber', key: 'tripNumber', width: 18 },
    { header: 'trackCode', key: 'trackCode', width: 18 },
    { header: 'driver', key: 'driver', width: 22 },
    { header: 'counterparty', key: 'counterparty', width: 24 },
    { header: 'note', key: 'note', width: 32 },
    { header: 'status', key: 'status', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(`${month}-01T00:00:00+08:00`);
  const end = new Date(`${year + (monthNumber === 12 ? 1 : 0)}-${String(monthNumber === 12 ? 1 : monthNumber + 1).padStart(2, '0')}-01T00:00:00+08:00`);
  const rows = await db.transaction.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
    take: 10000,
    include: {
      account: { select: { name: true } }, category: { select: { name: true } },
      trip: { select: { tripNumber: true } }, cargo: { select: { trackCode: true } },
      driver: { select: { name: true } },
    },
  });
  for (const row of rows) {
    sheet.addRow({
      date: formatDate(row.date),
      type: row.type,
      amount: formatMinor(row.amountMinor, row.currency).replace(/[₮¥,]/g, ''),
      currency: row.currency,
      fxRate: row.fxRate?.toString() ?? '',
      amountMNT: formatMinor(row.amountMntMinor, 'MNT').replace(/[₮,]/g, ''),
      method: row.method,
      account: row.account.name,
      category: row.category?.name ?? '',
      tripNumber: row.trip?.tripNumber ?? '',
      trackCode: row.cargo?.trackCode ?? '',
      driver: row.driver?.name ?? '',
      counterparty: row.counterparty ?? '',
      note: row.note ?? '',
      status: row.status,
    });
  }
  const bytes = await workbook.xlsx.writeBuffer();
  const locale = await getLocale();
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="transactions-${month}-${locale}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
