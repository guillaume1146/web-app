import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Restricts access to admin and regional-admin roles.
 * Usage: @UseGuards(AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !['admin', 'regional-admin'].includes(user.userType)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
