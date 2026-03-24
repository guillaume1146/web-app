'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { useUser } from '@/hooks/useUser'
import DashboardHeader from './DashboardHeader'
import DashboardSidebar, { type SidebarItem } from './DashboardSidebar'

interface DashboardLayoutProps {
 children: React.ReactNode
 userName: string
 userImage?: string | null
 userSubtitle: string
 sidebarItems: SidebarItem[]
 activeSectionId: string
 notificationCount?: number
 /** @deprecated Use profileHref instead */
 settingsHref?: string
 profileHref?: string
 networkHref?: string
 onLogout: () => void
 sidebarFooter?: React.ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
 children,
 userName,
 userImage,
 userSubtitle,
 sidebarItems,
 activeSectionId,
 notificationCount = 0,
 settingsHref,
 profileHref,
 networkHref,
 onLogout,
 sidebarFooter,
}) => {
 const [sidebarOpen, setSidebarOpen] = useState(true)
 const [isMobile, setIsMobile] = useState(false)
 const { user: currentUser } = useUser()
 const userId = currentUser?.id

 // Use profileHref if provided, fall back to settingsHref for backwards compat
 const resolvedProfileHref = profileHref || settingsHref || '/profile'

 useEffect(() => {
 const handleResize = () => {
 const mobile = window.innerWidth < 768
 setIsMobile(mobile)
 if (mobile) setSidebarOpen(false)
 }

 handleResize()
 window.addEventListener('resize', handleResize)
 return () => window.removeEventListener('resize', handleResize)
 }, [])

 // Socket.IO: connect and listen for real-time notifications
 const setupSocket = useCallback(async () => {
 if (!userId) return
 const { io } = await import('socket.io-client')
 const socket = io({ transports: ['websocket', 'polling'] })
 socket.on('connect', () => {
 socket.emit('chat:join', { userId })
 })
 socket.on('notification:new', (data: { title: string; message: string; id: string; type: string; createdAt: string }) => {
 toast.info(
 <div>
 <p className="font-semibold text-sm">{data.title}</p>
 <p className="text-xs text-gray-600 mt-0.5">{data.message}</p>
 </div>,
 { autoClose: 5000 }
 )
 window.dispatchEvent(new CustomEvent('notification:new', { detail: data }))
 })
 return () => {
 socket.disconnect()
 }
 }, [userId])

 useEffect(() => {
 let cleanup: (() => void) | undefined
 setupSocket().then(fn => { cleanup = fn })
 return () => { cleanup?.() }
 }, [setupSocket])

 const handleToggleSidebar = () => {
 setSidebarOpen((prev) => !prev)
 }

 const handleCloseSidebar = () => {
 setSidebarOpen(false)
 }

 return (
 <div className="h-screen flex flex-col overflow-hidden">
 {/* Skip to content link */}
 <a
 href="#dashboard-main-content"
 className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
 >
 Skip to main content
 </a>

 {/* Single header with logo, user info, notifications, logout */}
 <DashboardHeader
 userName={userName}
 userImage={userImage}
 userSubtitle={userSubtitle}
 notificationCount={notificationCount}
 profileHref={resolvedProfileHref}
 networkHref={networkHref}
 sidebarOpen={sidebarOpen}
 onToggleSidebar={handleToggleSidebar}
 onLogout={onLogout}
 userId={userId}
 />

 {/* Sidebar + Main content */}
 <div className="flex flex-1 overflow-hidden">
 <DashboardSidebar
 items={sidebarItems}
 activeItemId={activeSectionId}
 isOpen={sidebarOpen}
 isMobile={isMobile}
 onClose={handleCloseSidebar}
 footer={sidebarFooter}
 />

 <main
 id="dashboard-main-content"
 role="main"
 className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8"
 >
 {children}
 </main>
 </div>

 {/* Mobile overlay backdrop */}
 {isMobile && sidebarOpen && (
 <div
 className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
 onClick={handleCloseSidebar}
 aria-hidden="true"
 />
 )}
 </div>
 )
}

export default DashboardLayout
