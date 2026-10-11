import { TripStatus } from '@/generated/prisma/enums';

export const TRIP_STATUSES: TripStatus[] = Object.values(TripStatus);

export function isTripStatus(value: unknown): value is TripStatus {
  return typeof value === 'string' && (TRIP_STATUSES as string[]).includes(value);
}
