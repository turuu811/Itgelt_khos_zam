import { getTranslations, setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireUser } from '@/lib/guards';
import { currentMonth, formatDate } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { monthTotals } from '@/features/finance/queries';
import { CLOSED_STATUSES } from '@/features/cargo/constants';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, user] = await Promise.all([params, requireUser()]);
  setRequestLocale(locale);

  const t = await getTranslations('dashboard');
  const tc = await getTranslations('common');
  const ts = await getTranslations('status');
  const month = currentMonth();
  const canReadCargo = can(user.role, 'cargo:read');
  const canReadTrips = can(user.role, 'trip:read');
  const canReadFinance = can(user.role, 'finance:read');

  const [activeCargo, statusRows, recentCargo, openTrips, totals] = await Promise.all([
    canReadCargo
      ? db.cargo.count({ where: { status: { notIn: CLOSED_STATUSES } } })
      : Promise.resolve(0),
    canReadCargo
      ? db.cargo.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { _count: { status: 'desc' } } })
      : Promise.resolve([]),
    canReadCargo
      ? db.cargo.findMany({
          take: 6,
          orderBy: { receivedAt: 'desc' },
          select: {
            id: true,
            trackCode: true,
            description: true,
            status: true,
            receivedAt: true,
            customer: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    canReadTrips
      ? db.trip.findMany({
          where: { status: { not: 'CLOSED' } },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            tripNumber: true,
            status: true,
            vehicle: { select: { plateNumber: true } },
            driver: { select: { name: true } },
            _count: { select: { cargo: true } },
          },
        })
      : Promise.resolve([]),
    canReadFinance ? monthTotals(month) : Promise.resolve(null),
  ]);

  const cards = canReadFinance && totals
    ? [
        { label: t('income'), amount: formatMinor(totals.income, 'MNT'), accent: 'text-emerald-700', background: 'bg-emerald-50' },
        { label: t('expense'), amount: formatMinor(totals.expense, 'MNT'), accent: 'text-amber-700', background: 'bg-amber-50' },
        { label: t('driverPayment'), amount: formatMinor(totals.driverPayment, 'MNT'), accent: 'text-sky-700', background: 'bg-sky-50' },
        { label: t('profit'), amount: formatMinor(totals.profit, 'MNT'), accent: 'text-teal-800', background: 'bg-teal-50' },
      ]
    : [];
  const statusCount = statusRows.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">{t('greeting')}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{t('title')}</h1>
          <p className="mt-2 text-sm text-slate-500">{t('updatedAt', { date: formatDate(new Date()) })}</p>
        </div>
      </header>

      {canReadFinance ? (
        <section aria-labelledby="month-summary">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="month-summary" className="text-sm font-semibold text-slate-700">{t('monthTitle')}</h2>
            <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">{month}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${card.background} ${card.accent}`}>{card.label}</div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{card.amount}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        {canReadCargo ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-950">{t('latest')}</h2>
                <p className="mt-1 text-xs text-slate-500">{t('activeCargo')}: {activeCargo}</p>
              </div>
            </div>

            {recentCargo.length ? (
              <div className="divide-y divide-slate-100">
                {recentCargo.map((cargo) => (
                  <article key={cargo.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{cargo.trackCode}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{cargo.customer.name}{cargo.description ? ` · ${cargo.description}` : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{ts(cargo.status)}</span>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(cargo.receivedAt)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">{tc('empty')}</p>
            )}
          </div>
        ) : null}

        {canReadCargo ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-slate-950">{t('byStatus')}</h2>
              <span className="text-xs text-slate-500">{t('statusCount', { count: statusCount })}</span>
            </div>
            {statusRows.length ? (
              <ul className="mt-5 space-y-4">
                {statusRows.map((row) => {
                  const count = row._count._all;
                  const percent = statusCount ? Math.round((count / statusCount) * 100) : 0;
                  return (
                    <li key={row.status}>
                      <div className="mb-1.5 flex justify-between gap-3 text-sm">
                        <span className="text-slate-600">{ts(row.status)}</span>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-teal-600" style={{ width: `${percent}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-5 text-sm text-slate-500">{tc('empty')}</p>
            )}
          </div>
        ) : null}
      </section>

      {canReadTrips ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">{t('openTrips')}</h2>
              <p className="mt-1 text-xs text-slate-500">{t('openTripsDescription')}</p>
            </div>
          </div>
          {openTrips.length ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {openTrips.map((trip) => (
                <article key={trip.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-900">{trip.tripNumber}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{t(`tripStatuses.${trip.status}`)}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{trip.vehicle.plateNumber} · {trip.driver.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{t('cargoCount', { count: trip._count.cargo })}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-slate-500">{tc('empty')}</p>
          )}
        </section>
      ) : null}

      {canReadFinance ? (
        <p className="text-xs leading-5 text-slate-500">{t('financeNote')}</p>
      ) : null}
    </div>
  );
}
