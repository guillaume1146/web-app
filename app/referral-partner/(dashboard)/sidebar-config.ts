import { FaHome, FaNewspaper, FaHandshake, FaComments, FaVideo, FaPhone, FaMoneyBillWave, FaBell } from 'react-icons/fa'
import type { SidebarItem } from '@/components/dashboard/DashboardSidebar'
import { createGetActiveSectionFromPath } from '@/lib/dashboard/getActiveSectionFromPath'
import { getPatientHealthItems, getSearchItems, getInviteFriendsItem } from '@/lib/dashboard/patientHealthItems'

const base = '/referral-partner'

export const REFERRAL_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'feed', label: 'Feed', labelKey: 'nav.feed', icon: FaNewspaper, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
  { id: 'overview', label: 'Dashboard', labelKey: 'nav.overview', icon: FaHome, color: 'text-blue-600', bgColor: 'bg-blue-50', href: base },
  { id: 'hub', label: 'My Referrals', labelKey: 'nav.referrals', icon: FaHandshake, color: 'text-indigo-600', bgColor: 'bg-indigo-50', href: `${base}/hub` },
  { id: 'billing', label: 'Billing', labelKey: 'nav.billing', icon: FaMoneyBillWave, color: 'text-emerald-600', bgColor: 'bg-emerald-50', href: `${base}/billing` },
  { id: 'video', label: 'Video Call', labelKey: 'nav.video', icon: FaVideo, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/video` },
  { id: 'audio', label: 'Audio Call', icon: FaPhone, color: 'text-cyan-600', bgColor: 'bg-cyan-50', href: `${base}/audio` },
  { id: 'messages', label: 'Messages', labelKey: 'nav.messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
  { id: 'notifications', label: 'Notifications', labelKey: 'nav.notifications', icon: FaBell, color: 'text-amber-600', bgColor: 'bg-amber-50', href: `${base}/notifications` },
  ...getPatientHealthItems(base),
  getInviteFriendsItem(base),
  ...getSearchItems(base),
]

export const getActiveSectionFromPath = createGetActiveSectionFromPath(base, REFERRAL_SIDEBAR_ITEMS)
