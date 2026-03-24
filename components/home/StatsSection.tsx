'use client'

import { useState, useEffect } from 'react'
import StatCard from '@/components/shared/StatCard'

interface StatItem {
 number: string | number
 label: string
 color?: string
}

const LOADING_STATS: StatItem[] = [
 { number: '500+', label: 'Qualified Doctors', color: 'text-blue-500' },
 { number: '10,000+', label: 'Happy Patients', color: 'text-green-500' },
 { number: '25,000+', label: 'Consultations', color: 'text-purple-500' },
 { number: '20+', label: 'Cities Covered', color: 'text-orange-500' },
]

const StatsSection: React.FC = () => {
 const [stats, setStats] = useState<StatItem[]>(LOADING_STATS)

 useEffect(() => {
 const fetchStats = async () => {
 try {
 const res = await fetch('/api/stats')
 const data = await res.json()
 if (data.success && data.data) {
 setStats(data.data.map((s: { number: number; label: string; color: string }) => ({
 number: s.number,
 label: s.label,
 color: s.color,
 })))
 }
 } catch {
 // Keep loading state
 }
 }
 fetchStats()
 }, [])

 return (
 <section className="bg-white py-12">
 <div className="container mx-auto px-4">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
 {stats.map((stat, index) => (
 <StatCard key={index} {...stat} />
 ))}
 </div>
 </div>
 </section>
 )
}

export default StatsSection
