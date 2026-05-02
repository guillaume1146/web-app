import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;       // user ID
  userType: string;  // cookie-style user type (e.g. 'doctor', 'patient')
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Extract JWT from the mediwyz_token httpOnly cookie.
 * Falls back to Authorization Bearer header for API clients.
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  // 1. Try cookie first (browser clients)
  const cookieToken = req.cookies?.mediwyz_token;
  if (cookieToken) return cookieToken;

  // 2. Fall back to Authorization header (API clients, mobile app)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET || 'mediwyz-dev-secret-change-in-production';

    super({
      jwtFromRequest: ExtractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Called after JWT is verified. The returned object is set on req.user.
   */
  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub || !payload.userType) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}

// Named export for passport-jwt's custom extractor
function ExtractJwtFromCookieOrHeader(req: Request): string | null {
  return extractJwtFromCookieOrHeader(req);
}
