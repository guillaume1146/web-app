import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FeatureAccessGuard } from './guards/feature-access.guard';
import { SuperAdminBootstrap } from './super-admin.bootstrap';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    SuperAdminBootstrap,

    // Apply JWT auth globally — routes need @Public() to skip
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // FeatureAccessGuard is NOT global — use @UseGuards(FeatureAccessGuard) per route
    FeatureAccessGuard,
  ],
  exports: [AuthService, FeatureAccessGuard],
})
export class AuthModule {}
