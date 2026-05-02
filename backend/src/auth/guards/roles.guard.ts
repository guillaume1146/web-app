import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Dynamic roles guard — checks if the authenticated user's userType
 * matches one of the allowed roles set by @Roles() decorator.
 *
 * NOT global — use @UseGuards(RolesGuard) on specific controllers/routes.
 * Roles are DB-driven strings (e.g., 'DOCTOR', 'NURSE', 'OPTICIAN'),
 * not hardcoded enums.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Wildcard → any authenticated user
    if (requiredRoles.includes('*')) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.userType) {
      return false;
    }

    // Check if user's type matches any required role (case-insensitive)
    const userType = user.userType.toUpperCase();
    return requiredRoles.some(role => role.toUpperCase() === userType);
  }
}
