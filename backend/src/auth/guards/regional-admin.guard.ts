import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Restricts access to REGIONAL_ADMIN only (not the central super-admin).
 * Use this when an endpoint should be visible to regional admins but NOT to
 * the central admin — e.g. "manage my region's workflows".
 * For endpoints accessible to both, use AdminGuard instead.
 */
@Injectable()
export class RegionalAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.userType !== 'regional-admin') {
      throw new ForbiddenException('Regional admin access required');
    }

    return true;
  }
}
