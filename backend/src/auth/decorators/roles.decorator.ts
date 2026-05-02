import { SetMetadata } from '@nestjs/common';

/**
 * Dynamic roles decorator — checks user's role against allowed roles.
 * Roles are DB-driven via ProviderRole, not hardcoded enums.
 *
 * Usage: @Roles('DOCTOR', 'NURSE') or @Roles('REGIONAL_ADMIN')
 * Use '*' to allow any authenticated user.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
