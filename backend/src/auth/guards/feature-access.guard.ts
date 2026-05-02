import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';

/**
 * Checks RoleFeatureConfig in DB to determine if the user's role
 * has access to the requested feature. Managed by regional admins.
 */
@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get<string>(FEATURE_KEY, context.getHandler());
    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userType) return false;

    // Resolve the Prisma userType from the cookie-style userType
    const config = await this.prisma.roleFeatureConfig.findUnique({
      where: {
        userType_featureKey: {
          userType: user.userType.toUpperCase(),
          featureKey: requiredFeature,
        },
      },
    });

    // Default: enabled if no config exists (allEnabled behavior)
    return config?.enabled !== false;
  }
}
