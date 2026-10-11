// Эрхийн матриц: хэн юу хийж чадах вэ гэдгийг ЗӨВХӨН ЭНД тодорхойлно.
import type { Role } from '@/generated/prisma/enums';

export const ALL_PERMISSIONS = [
  'cargo:read',
  'cargo:write',
  'cargo:status',
  'customer:read',
  'customer:write',
  'finance:read',
  'finance:write',
  'finance:void',
  'inquiry:read',
  'inquiry:write',
  'trip:read',
  'trip:write',
  'report:read',
  'import:run',
  'admin:users',
  'admin:audit',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: ALL_PERMISSIONS,
  MANAGER: [
    'cargo:read',
    'cargo:write',
    'cargo:status',
    'customer:read',
    'customer:write',
    'finance:read',
    'finance:write',
    'finance:void',
    'inquiry:read',
    'inquiry:write',
    'trip:read',
    'trip:write',
    'report:read',
    'import:run',
  ],
  ACCOUNTANT: ['cargo:read', 'customer:read', 'finance:read', 'finance:write', 'finance:void', 'trip:read', 'report:read'],
  WAREHOUSE: ['cargo:read', 'cargo:write', 'cargo:status', 'customer:read', 'trip:read'],
  // Харилцагчийн портал үе 2-т нэмэгдэнэ. Одоогоор нэвтэрч чадахгүй.
  CUSTOMER: [],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}
