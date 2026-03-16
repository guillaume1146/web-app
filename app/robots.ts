import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mediwyz.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/patient/',
          '/doctor/',
          '/nurse/',
          '/nanny/',
          '/pharmacist/',
          '/lab-technician/',
          '/responder/',
          '/insurance/',
          '/corporate/',
          '/referral-partner/',
          '/regional/',
          '/admin/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
