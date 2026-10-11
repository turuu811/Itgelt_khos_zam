'use server';

import ExcelJS from 'exceljs';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/permissions';
import { localDateToDate, formatDate } from '@/lib/dates';
import { toMinor, toMntMinor } from '@/lib/money';
import { writeAudit } from '@/lib/audit';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 100;
const HEADERS = [
  'date',
  'type',
  'amount',
  'currency',
  'fxRate',
  'method',
  'account',
  'category',
  'tripNumber',
  'trackCode',
  'driver',
  'counterparty',
  'note',
] as const;

type ImportRow = {
  date: Date;
  type: 'INCOME' | 'EXPENSE' | 'DRIVER_PAYMENT';
  amountMinor: bigint;
  currency: 'MNT' | 'CNY';
  fxRate: string | null;
  amountMntMinor: bigint;
  method: 'CASH' | 'BANK' | 'WECHAT_ALIPAY' | 'OTHER';
  accountId: string;
  categoryId: string | null;
  tripId: string | null;
  cargoId: string | null;
  driverId: string | null;
  counterparty: string | null;
  note: string | null;
  rowNumber: number;
};

type ParsedImportRow = Omit<ImportRow, 'accountId' | 'categoryId' | 'tripId' | 'cargoId' | 'driverId'> & {
  accountName: string;
  categoryName: string;
  tripNumber: string;
  trackCode: string;
  driverName: string;
};

class ImportFailure extends Error {
  constructor(readonly result: string) {
    super(result);
  }
}

export async function importTransactions(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const goBack = (query: string) => redirect({ href: `/finance/import?${query}`, locale });
  if (!user || !can(user.role, 'import:run')) return goBack('result=forbidden');

  const fileValue = formData.get('file');
  if (!(fileValue instanceof File) || fileValue.size === 0 || !fileValue.name.toLowerCase().endsWith('.xlsx')) {
    return goBack('result=invalid');
  }
  if (fileValue.size > MAX_FILE_BYTES) return goBack('result=large');

  let importedCount = 0;
  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(await fileValue.arrayBuffer());
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet('Transactions');
    if (!sheet || sheet.rowCount < 2) throw new ImportFailure('invalid');

    const headerMap = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, column) => headerMap.set(String(cell.text).trim(), column));
    if (HEADERS.some((header) => !headerMap.has(header))) throw new ImportFailure('invalid');

    const read = (row: ExcelJS.Row, key: (typeof HEADERS)[number]) => {
      const value = row.getCell(headerMap.get(key)!).value;
      if (value instanceof Date) return formatDate(value);
      if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
      return '';
    };

    const parsedRows: ParsedImportRow[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      let hasValue = false;
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (String(cell.text).trim()) hasValue = true;
      });
      if (!hasValue) continue;
      if (parsedRows.length >= MAX_ROWS) throw new ImportFailure('tooMany');

      const dateText = read(row, 'date');
      const date = localDateToDate(dateText);
      const typeInput = read(row, 'type');
      const currencyInput = read(row, 'currency');
      const methodInput = read(row, 'method');
      const amount = read(row, 'amount');
      const fxRateInput = read(row, 'fxRate');
      if (
        !date ||
        formatDate(date) !== dateText ||
        !['INCOME', 'EXPENSE', 'DRIVER_PAYMENT'].includes(typeInput) ||
        !['MNT', 'CNY'].includes(currencyInput) ||
        !['CASH', 'BANK', 'WECHAT_ALIPAY', 'OTHER'].includes(methodInput)
      ) {
        throw new ImportFailure('invalid');
      }
      const type = typeInput as ImportRow['type'];
      const currency = currencyInput as ImportRow['currency'];
      const method = methodInput as ImportRow['method'];

      let amountMinor = 0n;
      let amountMntMinor = 0n;
      let fxRate: string | null = null;
      try {
        amountMinor = toMinor(amount);
        if (amountMinor <= 0n) throw new ImportFailure('invalid');
        if (currency === 'CNY') {
          amountMntMinor = toMntMinor(amountMinor, 'CNY', fxRateInput);
          fxRate = fxRateInput.replace(/[\s,]/g, '');
        } else {
          amountMntMinor = amountMinor;
        }
      } catch (error) {
        if (error instanceof ImportFailure) throw error;
        throw new ImportFailure('invalid');
      }

      parsedRows.push({
        date,
        type: type as ImportRow['type'],
        amountMinor: amountMinor!,
        currency: currency as ImportRow['currency'],
        fxRate,
        amountMntMinor: amountMntMinor!,
        method: method as ImportRow['method'],
        accountName: read(row, 'account'),
        categoryName: read(row, 'category'),
        tripNumber: read(row, 'tripNumber'),
        trackCode: read(row, 'trackCode'),
        driverName: read(row, 'driver'),
        counterparty: read(row, 'counterparty').slice(0, 200) || null,
        note: read(row, 'note').slice(0, 1000) || null,
        rowNumber,
      });
    }
    if (parsedRows.length === 0) throw new ImportFailure('invalid');

    const [accounts, categories, trips, cargo, drivers] = await Promise.all([
      db.account.findMany({ where: { isActive: true } }),
      db.category.findMany({ where: { isActive: true } }),
      db.trip.findMany({ select: { id: true, tripNumber: true } }),
      db.cargo.findMany({ select: { id: true, trackCode: true } }),
      db.driver.findMany({ select: { id: true, name: true } }),
    ]);

    const rows: ImportRow[] = [];
    for (const raw of parsedRows) {
      const accountMatches = accounts.filter((item) => item.name === raw.accountName && item.currency === raw.currency);
      const categoryMatches = raw.categoryName
        ? categories.filter((item) => item.name === raw.categoryName && item.type === raw.type)
        : [];
      const tripMatches = raw.tripNumber ? trips.filter((item) => item.tripNumber === raw.tripNumber) : [];
      const cargoMatches = raw.trackCode ? cargo.filter((item) => item.trackCode === raw.trackCode) : [];
      const driverMatches = raw.driverName ? drivers.filter((item) => item.name === raw.driverName) : [];

      if (
        accountMatches.length !== 1 ||
        (raw.categoryName && categoryMatches.length !== 1) ||
        (raw.tripNumber && tripMatches.length !== 1) ||
        (raw.trackCode && cargoMatches.length !== 1) ||
        (raw.driverName && driverMatches.length !== 1) ||
        (raw.type === 'DRIVER_PAYMENT' && driverMatches.length !== 1) ||
        (raw.type !== 'DRIVER_PAYMENT' && raw.driverName)
      ) {
        throw new ImportFailure(`row&line=${raw.rowNumber}`);
      }

      rows.push({
        date: raw.date,
        type: raw.type,
        amountMinor: raw.amountMinor,
        currency: raw.currency,
        fxRate: raw.fxRate,
        amountMntMinor: raw.amountMntMinor,
        method: raw.method,
        accountId: accountMatches[0].id,
        categoryId: categoryMatches[0]?.id ?? null,
        tripId: tripMatches[0]?.id ?? null,
        cargoId: cargoMatches[0]?.id ?? null,
        driverId: driverMatches[0]?.id ?? null,
        counterparty: raw.counterparty,
        note: raw.note,
        rowNumber: raw.rowNumber,
      });
    }

    await db.$transaction(
      async (tx) => {
        for (const row of rows) {
          const created = await tx.transaction.create({
            data: {
              date: row.date,
              type: row.type,
              amountMinor: row.amountMinor,
              currency: row.currency,
              fxRate: row.fxRate,
              amountMntMinor: row.amountMntMinor,
              method: row.method,
              accountId: row.accountId,
              categoryId: row.categoryId,
              tripId: row.tripId,
              cargoId: row.cargoId,
              driverId: row.driverId,
              counterparty: row.counterparty,
              note: row.note,
              createdById: user!.id,
            },
          });
          await writeAudit(tx, {
            userId: user!.id,
            action: 'transaction.import',
            entity: 'Transaction',
            entityId: created.id,
            after: created,
          });
        }
      },
      { timeout: 30000 },
    );
    importedCount = rows.length;
  } catch (error) {
    if (error instanceof ImportFailure) return goBack(`result=${error.result}`);
    return goBack('result=invalid');
  }
  return goBack(`imported=${importedCount}`);
}