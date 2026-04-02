'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { FaUsers, FaFileAlt, FaShieldAlt, FaToggleOn, FaClipboardList, FaCrown } from 'react-icons/fa'

const UsersContent = dynamic(() => import('../users/page'), { ssr: false, loading: () => <TabLoading /> })
const ContentContent = dynamic(() => import('../content/page'), { ssr: false, loading: () => <TabLoading /> })
const SecurityContent = dynamic(() => import('../security/page'), { ssr: false, loading: () => <TabLoading /> })
const RoleConfigContent = dynamic(() => import('../role-config/page'), { ssr: false, loading: () => <TabLoading /> })
const DocumentsContent = dynamic(() => import('../required-documents/page'), { ssr: false, loading: () => <TabLoading /> })
const NotificationsContent = dynamic(() => import('../notifications/page'), { ssr: false, loading: () => <TabLoading /> })
const SubscriptionsContent = dynamic(() => import('../subscriptions/page'), { ssr: false, loading: () => <TabLoading /> })

function TabLoading() {
 return (
 <div className="flex items-center justify-center py-20">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
 </div>
 )
}

const TABS = [
 { id: 'users', label: 'Users', icon: FaUsers },
 { id: 'content', label: 'Content', icon: FaFileAlt },
 { id: 'security', label: 'Security', icon: FaShieldAlt },
 { id: 'roles', label: 'Roles', icon: FaToggleOn },
 { id: 'documents', label: 'Docs', icon: FaClipboardList },
 { id: 'subscriptions', label: 'Plans', icon: FaCrown },
] as const

type TabId = typeof TABS[number]['id']

export default function RegionalAdministrationPage() {
 const [activeTab, setActiveTab] = useState<TabId>('users')

 return (
 <div className="pb-20 sm:pb-0">
 <div className="hidden sm:block border-b border-gray-200 bg-white rounded-t-xl mb-0">
 <div className="flex overflow-x-auto">
 {TABS.map((tab) => {
 const Icon = tab.icon
 const isActive = activeTab === tab.id
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
 isActive
 ? 'border-blue-600 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 <Icon className={isActive ? 'text-blue-600' : 'text-gray-400'} />
 {tab.label}
 </button>
 )
 })}
 </div>
 </div>

 <div>
 {activeTab === 'users' && <UsersContent />}
 {activeTab === 'content' && <ContentContent />}
 {activeTab === 'security' && <SecurityContent />}
 {activeTab === 'roles' && <RoleConfigContent />}
 {activeTab === 'documents' && <DocumentsContent />}
 {activeTab === 'subscriptions' && <SubscriptionsContent />}
 </div>

 <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-1 z-50 shadow-lg">
 {TABS.map((tab) => {
 const Icon = tab.icon
 const isActive = activeTab === tab.id
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex flex-col items-center justify-center p-1 min-w-[40px] ${
 isActive ? 'text-blue-600' : 'text-gray-400'
 }`}
 >
 <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
 <span className="text-[10px] mt-0.5">{tab.label}</span>
 {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />}
 </button>
 )
 })}
 </div>
 </div>
 )
}
