import {
  FaHome,
  FaNewspaper,
  FaHeartbeat,
  FaRobot,
  FaVideo,
  FaComments,
  FaMoneyBillWave,
} from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getSearchItems } from '@/lib/dashboard/patientHealthItems'

const base = '/patient'

export const PATIENT_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', labelKey: 'nav.feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', labelKey: 'nav.overview', icon: FaHome, color: 'text-blue-600', bgColor: 'bg-blue-50', href: base },
  { id: 'ai-assistant', label: 'AI Health Assistant', labelKey: 'nav.aiAssistant', icon: FaRobot, color: 'text-indigo-600', bgColor: 'bg-indigo-50', href: `${base}/ai-assistant` },
  { id: 'health', label: 'My Health', labelKey: 'nav.health', icon: FaHeartbeat, color: 'text-red-600', bgColor: 'bg-red-50', href: `${base}/health` },
  { id: 'billing', label: 'Billing', labelKey: 'nav.billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'video', label: 'Video Call', labelKey: 'nav.video', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'chat', label: 'Messages', labelKey: 'nav.messages', icon: FaComments, color: 'text-blue-600', bgColor: 'bg-blue-50', href: `${base}/chat` },
  ...getSearchItems(base),
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, PATIENT_SIDEBAR_ITEMS)
