import { UserRole } from '@ludo-game/shared-types';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export function toObjectIdString(value: { toString(): string } | string): string {
  return typeof value === 'string' ? value : value.toString();
}
