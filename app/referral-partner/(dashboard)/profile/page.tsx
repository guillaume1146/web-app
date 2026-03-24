'use client'

import { useDashboardUser } from '@/hooks/useDashboardUser'
import UserProfile from '@/components/profile/UserProfile'

export default function ReferralPartnerProfilePage() {
 const user = useDashboardUser()
 if (!user) return <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
 return <UserProfile userId={user.id} userType={user.userType} settingsPath="/referral-partner/profile" />
}
