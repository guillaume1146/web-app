'use client'

import { useDashboardUser } from '@/hooks/useDashboardUser'

export default function MyChildcare() {
  const user = useDashboardUser()
  if (!user) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
  
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Childcare</h2>
      <p className="text-gray-500 text-sm">View your Childcare history and upcoming appointments.</p>
    </div>
  )
}
