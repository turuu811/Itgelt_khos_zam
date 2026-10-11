import { CargoStatus } from '@/generated/prisma/enums';

export const CARGO_STATUSES: CargoStatus[] = Object.values(CargoStatus);

// Дуусаагүй ачаа = эдгээрээс бусад
export const CLOSED_STATUSES: CargoStatus[] = ['DELIVERED', 'CANCELLED'];

export function isCargoStatus(value: unknown): value is CargoStatus {
  return typeof value === 'string' && (CARGO_STATUSES as string[]).includes(value);
}
