'use client'

import { useDashboardUser } from '@/hooks/useDashboardUser'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'

export default function DentistDashboardPage() {
 const user = useDashboardUser()
 if (!user) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>

 return (
 <div className="space-y-6">
 <h1 className="text-2xl font-bold text-gray-900">Dentist Dashboard</h1>
 <WalletBalanceCard userId={user.id} />
 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">Welcome, {user.firstName}!</h2>
 <p className="text-gray-600">Your dentist dashboard is ready. Use the sidebar to navigate.</p>
 </div>
 </div>
 )
}
