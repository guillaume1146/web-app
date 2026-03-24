import { IconType } from 'react-icons'

export interface DashboardStatCardProps {
 icon: IconType
 title: string
 value: string | number
 color: string
 subtitle?: string
 trend?: number
}

export default function DashboardStatCard({ icon: Icon, title, value, color, subtitle, trend }: DashboardStatCardProps) {
 return (
 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform hover:-translate-y-1 transition-transform duration-300">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-gray-600 text-sm font-medium">{title}</p>
 <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
 {subtitle && (
 <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
 )}
 {trend !== undefined && (
 <p className={`text-sm mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {trend >= 0 ? '+' : ''}{trend}% from last month
 </p>
 )}
 </div>
 <div className={`p-3 rounded-full ${color}`}>
 <Icon className="text-white text-xl" />
 </div>
 </div>
 </div>
 )
}
