import { FaHome, FaNewspaper, FaUsers, FaShieldAlt, FaComments, FaVideo, FaFileAlt, FaMoneyBillWave, FaGlobeAmericas, FaToggleOn, FaSlidersH, FaBell, FaRobot } from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getSearchItems } from '@/lib/dashboard/patientHealthItems'

const base = '/admin'

export const ADMIN_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', icon: FaHome, color: 'text-blue-600', bgColor: 'bg-blue-50', href: base },
  { id: 'users', label: 'Users', icon: FaUsers, color: 'text-purple-600', bgColor: 'bg-purple-50', href: `${base}/users` },
  { id: 'security', label: 'Security', icon: FaShieldAlt, color: 'text-red-600', bgColor: 'bg-red-50', href: `${base}/security` },
  { id: 'content', label: 'Content', icon: FaFileAlt, color: 'text-indigo-600', bgColor: 'bg-indigo-50', href: `${base}/content` },
  { id: 'commission-config', label: 'Commission Config', icon: FaSlidersH, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/commission-config` },
  { id: 'regional-admins', label: 'Regional Admins', icon: FaGlobeAmericas, color: 'text-teal-600', bgColor: 'bg-teal-50', href: `${base}/regional-admins` },
  { id: 'role-config', label: 'Role Config', icon: FaToggleOn, color: 'text-indigo-600', bgColor: 'bg-indigo-50', href: `${base}/role-config` },
  { id: 'billing', label: 'Billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'video', label: 'Video Call', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'messages', label: 'Messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
  { id: 'notifications', label: 'Notifications', icon: FaBell, color: 'text-yellow-600', bgColor: 'bg-yellow-50', href: `${base}/notifications` },
  { id: 'ai-assistant', label: 'AI Health Assistant', labelKey: 'nav.aiAssistant', icon: FaRobot, color: 'text-indigo-600', bgColor: 'bg-indigo-50', href: `${base}/ai-assistant` },
  ...getSearchItems(base),
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, ADMIN_SIDEBAR_ITEMS)
