import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfigService {
  getConfig() {
    return {
      appName: process.env.NEXT_PUBLIC_APP_NAME || 'MediWyz',
      appTagline: process.env.APP_TAGLINE || 'Your trusted healthcare companion',
      appDomain: process.env.APP_DOMAIN || 'mediwyz.com',
      heroTitle: process.env.HERO_TITLE || 'Your Health, Our Priority',
      platformDescription: process.env.PLATFORM_DESC || 'Your Leading Digital Health Platform',
    };
  }
}
