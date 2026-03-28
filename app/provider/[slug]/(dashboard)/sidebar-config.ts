import {
  FaHome, FaBriefcaseMedical, FaMoneyBillWave, FaCubes,
  FaCogs, FaProjectDiagram, FaVideo, FaComments,
  FaRss, FaRobot, FaHeart,
} from 'react-icons/fa'
import type { IconType } from 'react-icons'

export interface SidebarItem {
  id: string
  label: string
  icon: IconType
  color: string
  bgColor: string
  href: string
}

export function getDynamicProviderSidebarItems(slug: string): SidebarItem[] {
  const base = `/provider/${slug}`
  return [
    { id: 'feed', label: 'Feed', icon: FaRss, color: 'text-orange-600', bgColor: 'bg-orange-50', href: `${base}/feed` },
    { id: 'overview', label: 'Dashboard', icon: FaHome, color: 'text-blue-600', bgColor: 'bg-blue-50', href: base },
    { id: 'practice', label: 'My Practice', icon: FaBriefcaseMedical, color: 'text-cyan-600', bgColor: 'bg-cyan-50', href: `${base}/practice` },
    { id: 'billing', label: 'Billing', icon: FaMoneyBillWave, color: 'text-green-600', bgColor: 'bg-green-50', href: `${base}/billing` },
    { id: 'services', label: 'My Services', icon: FaCogs, color: 'text-purple-600', bgColor: 'bg-purple-50', href: `${base}/services` },
    { id: 'inventory', label: 'My Inventory', icon: FaCubes, color: 'text-amber-600', bgColor: 'bg-amber-50', href: `${base}/inventory` },
    { id: 'workflows', label: 'Workflows', icon: FaProjectDiagram, color: 'text-indigo-600', bgColor: 'bg-indigo-50', href: `${base}/workflows` },
    { id: 'video', label: 'Video Call', icon: FaVideo, color: 'text-teal-600', bgColor: 'bg-teal-50', href: `${base}/video` },
    { id: 'messages', label: 'Messages', icon: FaComments, color: 'text-pink-600', bgColor: 'bg-pink-50', href: `${base}/messages` },
    { id: 'ai', label: 'AI Health Assistant', icon: FaRobot, color: 'text-violet-600', bgColor: 'bg-violet-50', href: `${base}/ai-assistant` },
    { id: 'health', label: 'My Health', icon: FaHeart, color: 'text-red-600', bgColor: 'bg-red-50', href: `${base}/my-health` },
  ]
}

export function getActiveSectionFromPath(pathname: string): string {
  if (pathname.includes('/feed')) return 'feed'
  if (pathname.includes('/practice')) return 'practice'
  if (pathname.includes('/billing')) return 'billing'
  if (pathname.includes('/services')) return 'services'
  if (pathname.includes('/inventory')) return 'inventory'
  if (pathname.includes('/workflows')) return 'workflows'
  if (pathname.includes('/video')) return 'video'
  if (pathname.includes('/messages')) return 'messages'
  if (pathname.includes('/ai-assistant')) return 'ai'
  if (pathname.includes('/my-health')) return 'health'
  return 'overview'
}
