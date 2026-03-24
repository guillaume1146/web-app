'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { DashboardLayout, DashboardLoadingState } from '@/components/dashboard'
import { getSidebarConfig } from '@/lib/dashboard/sidebarRegistry'

export default function SearchDashboardWrapper({ children }: { children: React.ReactNode }) {
 const { user, loading: userLoading, clearUser } = useUser()
 const pathname = usePathname()
 const router = useRouter()

 if (userLoading) {
 return <DashboardLoadingState />
 }

 if (!user) {
 return <>{children}</>
 }

 const sidebarConfig = getSidebarConfig(user.userType)
 if (!sidebarConfig) {
 return <>{children}</>
 }

 const displayName = sidebarConfig.namePrefix
 ? `${sidebarConfig.namePrefix} ${user.firstName} ${user.lastName}`
 : `${user.firstName} ${user.lastName}`

 // Find active section — search items use 'search-*' ids
 const searchSegment = pathname.replace(/^\/search\/?/, '').split('/')[0]
 const activeSectionId = searchSegment ? `search-${searchSegment}` : 'overview'

 const handleLogout = () => {
 clearUser()
 router.push('/login')
 }

 return (
 <DashboardLayout
 userName={displayName}
 userSubtitle={sidebarConfig.userSubtitle}
 userImage={user.profileImage}
 sidebarItems={sidebarConfig.items}
 activeSectionId={activeSectionId}
 notificationCount={0}
 profileHref={sidebarConfig.profileHref}
 networkHref={sidebarConfig.networkHref}
 onLogout={handleLogout}
 >
 {children}
 </DashboardLayout>
 )
}
