'use client'

import { createDashboardLayout } from '@/lib/dashboard/createDashboardLayout'
import { REFERRAL_SIDEBAR_ITEMS, getActiveSectionFromPath } from './sidebar-config'

export default createDashboardLayout({
 userSubtitle: 'Referral Partner',
 sidebarItems: REFERRAL_SIDEBAR_ITEMS,
 getActiveSectionFromPath,
 profileHref: '/referral-partner/profile',
 networkHref: '/referral-partner/network',
})
