'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
 FaUsers,
 FaVideo,
 FaStar,
 FaStethoscope,
 FaPrescriptionBottle,
 FaHistory,
 FaCalendarCheck,
 FaDollarSign,
 FaUserMd,
 FaSpinner,
} from 'react-icons/fa'
import { useDoctorData } from './context'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'
import DoctorStatistics from './components/DoctorStatistics'

interface OverviewAppointment {
 id: string
 patientName: string
 date: string
 time: string
 type: string
 status: string
 reason: string
 roomId?: string
}

interface OverviewData {
 specialty: string[]
 clinicAffiliation: string
 rating: number
 reviewCount: number
 totalPatients: number
 upcomingAppointments: OverviewAppointment[]
 pastAppointments: OverviewAppointment[]
 activePrescriptions: number
 statistics: Record<string, unknown> | null
}

export default function DoctorOverviewPage() {
 const user = useDoctorData()
 const [data, setData] = useState<OverviewData | null>(null)
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 const fetchOverview = async () => {
 try {
 const [profileRes, upcomingRes, pastRes, patientsRes, prescRes, statsRes] = await Promise.all([
 fetch(`/api/users/${user.id}`),
 fetch(`/api/doctors/${user.id}/appointments?status=upcoming&limit=5`),
 fetch(`/api/doctors/${user.id}/appointments?status=completed&limit=5`),
 fetch(`/api/doctors/${user.id}/patients`),
 fetch(`/api/doctors/${user.id}/prescriptions`),
 fetch(`/api/doctors/${user.id}/statistics`),
 ])

 const [profile, upcoming, past, patients, prescriptions, statsJson] = await Promise.all([
 profileRes.json(),
 upcomingRes.json(),
 pastRes.json(),
 patientsRes.json(),
 prescRes.json(),
 statsRes.ok ? statsRes.json() : { success: false },
 ])

 const doctorProfile = profile.data?.doctorProfile || profile.data?.profile || {}

 const mapApt = (apt: {
 id: string
 patient?: { user: { firstName: string; lastName: string } }
 scheduledAt: string
 type?: string
 status: string
 reason?: string
 roomId?: string
 }): OverviewAppointment => ({
 id: apt.id,
 patientName: apt.patient
 ? `${apt.patient.user.firstName} ${apt.patient.user.lastName}`
 : 'Patient',
 date: apt.scheduledAt,
 time: new Date(apt.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
 type: (apt.type || '').replace(/_/g, '-'),
 status: apt.status,
 reason: apt.reason || '',
 roomId: apt.roomId,
 })

 setData({
 specialty: doctorProfile.specialty || [],
 clinicAffiliation: doctorProfile.clinicAffiliation || '',
 rating: doctorProfile.rating || 0,
 reviewCount: doctorProfile.reviewCount || 0,
 totalPatients: patients.data?.length || 0,
 upcomingAppointments: (upcoming.data || []).map(mapApt),
 pastAppointments: (past.data || []).map(mapApt),
 activePrescriptions: prescriptions.success
 ? (prescriptions.data || []).filter((p: { isActive: boolean }) => p.isActive).length
 : 0,
 statistics: statsJson.success ? statsJson.data : null,
 })
 } catch (error) {
 console.error('Failed to fetch overview:', error)
 setData({
 specialty: [],
 clinicAffiliation: '',
 rating: 0,
 reviewCount: 0,
 totalPatients: 0,
 upcomingAppointments: [],
 pastAppointments: [],
 activePrescriptions: 0,
 statistics: null,
 })
 } finally {
 setLoading(false)
 }
 }

 fetchOverview()
 }, [user.id])

 if (loading || !data) {
 return (
 <div className="flex items-center justify-center py-20">
 <FaSpinner className="animate-spin text-3xl text-blue-600" />
 </div>
 )
 }

 return (
 <div className="space-y-4 sm:space-y-5 md:space-y-6">
 {/* Welcome Banner */}
 <div className="bg-brand-navy rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 text-white">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <div>
 <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">
 Welcome back, Dr. {user.firstName}!
 </h2>
 <p className="opacity-90 text-xs sm:text-sm md:text-base lg:text-lg">
 {data.specialty.length > 0 ? data.specialty.join(', ') : 'Doctor'} {data.clinicAffiliation ? `\u2022 ${data.clinicAffiliation}` : ''}
 </p>
 </div>
 {data.rating > 0 && (
 <div className="hidden lg:flex items-center gap-3">
 <div className="text-right">
 <p className="text-xs opacity-80">Performance Rating</p>
 <div className="flex items-center gap-1">
 <FaStar className="text-yellow-300" />
 <span className="text-xl font-bold">{data.rating}</span>
 <span className="text-sm opacity-80">({data.reviewCount} reviews)</span>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Wallet Balance */}
 <WalletBalanceCard userId={user.id} />

 {/* Today's Schedule Overview */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg border border-green-100">
 <div className="flex items-center justify-between mb-3 sm:mb-4">
 <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-800">
 Today&rsquo;s Schedule
 </h3>
 <FaCalendarCheck className="text-green-500 text-base sm:text-lg md:text-xl lg:text-2xl" />
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
 <div>
 <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
 {data.upcomingAppointments.filter((a) => {
 const aptDate = new Date(a.date)
 const today = new Date()
 return aptDate.toDateString() === today.toDateString()
 }).length}
 </p>
 <p className="text-xs sm:text-sm text-gray-600">Today&rsquo;s Appointments</p>
 </div>
 <div>
 <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
 {data.upcomingAppointments.length}
 </p>
 <p className="text-xs sm:text-sm text-gray-600">Total Upcoming</p>
 </div>
 <div>
 <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">
 {data.totalPatients}
 </p>
 <p className="text-xs sm:text-sm text-gray-600">Total Patients</p>
 </div>
 </div>
 </div>

 {/* Quick Stats */}
 <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3 md:gap-4 lg:gap-5">
 <div className="bg-white rounded-xl p-4 md:p-5 lg:p-6 shadow-lg border border-blue-100">
 <div className="flex items-center justify-between">
 <div className="flex-1">
 <p className="text-gray-700 text-xs md:text-sm font-medium">Active Patients</p>
 <p className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-600 mt-1">
 {data.totalPatients}
 </p>
 </div>
 <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
 <FaUsers className="text-blue-600 text-base md:text-xl lg:text-2xl" />
 </div>
 </div>
 </div>

 <div className="bg-white rounded-xl p-4 md:p-5 lg:p-6 shadow-lg border border-green-100">
 <div className="flex items-center justify-between">
 <div className="flex-1">
 <p className="text-gray-700 text-xs md:text-sm font-medium">Upcoming</p>
 <p className="text-xl md:text-2xl lg:text-3xl font-bold text-green-600 mt-1">
 {data.upcomingAppointments.length}
 </p>
 <p className="text-xs md:text-sm text-green-600 mt-1">Appointments</p>
 </div>
 <div className="p-2 md:p-3 bg-green-100 rounded-lg">
 <FaDollarSign className="text-green-600 text-base md:text-xl lg:text-2xl" />
 </div>
 </div>
 </div>

 <div className="bg-white rounded-xl p-4 md:p-5 lg:p-6 shadow-lg border border-purple-100">
 <div className="flex items-center justify-between">
 <div className="flex-1">
 <p className="text-gray-700 text-xs md:text-sm font-medium">Consultations</p>
 <p className="text-xl md:text-2xl lg:text-3xl font-bold text-purple-600 mt-1">
 {data.pastAppointments.length}
 </p>
 <p className="text-xs md:text-sm text-purple-600 mt-1">Completed</p>
 </div>
 <div className="p-2 md:p-3 bg-purple-100 rounded-lg">
 <FaStethoscope className="text-purple-600 text-base md:text-xl lg:text-2xl" />
 </div>
 </div>
 </div>

 <div className="bg-white rounded-xl p-4 md:p-5 lg:p-6 shadow-lg border border-orange-100">
 <div className="flex items-center justify-between">
 <div className="flex-1">
 <p className="text-gray-700 text-xs md:text-sm font-medium">Prescriptions</p>
 <p className="text-xl md:text-2xl lg:text-3xl font-bold text-orange-600 mt-1">
 {data.activePrescriptions}
 </p>
 <p className="text-xs md:text-sm text-orange-600 mt-1">Active prescriptions</p>
 </div>
 <div className="p-2 md:p-3 bg-orange-100 rounded-lg">
 <FaPrescriptionBottle className="text-orange-600 text-base md:text-xl lg:text-2xl" />
 </div>
 </div>
 </div>
 </div>

 {/* Upcoming Appointments */}
 {data.upcomingAppointments.length > 0 && (
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg border border-indigo-100">
 <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
 Upcoming Appointments
 </h3>
 <div className="space-y-2 sm:space-y-3">
 {data.upcomingAppointments.slice(0, 3).map((appointment) => (
 <div
 key={appointment.id}
 className="flex items-center gap-3 md:gap-4 p-3 md:p-4 lg:p-5 bg-white bg-opacity-70 rounded-lg sm:rounded-xl hover:bg-opacity-90 transition"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0">
 <FaUserMd className="text-blue-600 text-sm sm:text-base" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-900 text-xs sm:text-sm md:text-base lg:text-lg truncate">
 {appointment.patientName}
 </p>
 <p className="text-xs md:text-sm text-gray-600 truncate">
 {new Date(appointment.date).toLocaleDateString()} at {appointment.time} &bull; {appointment.type}
 </p>
 </div>
 {appointment.type === 'video' && appointment.roomId && (
 <Link
 href={`/doctor/video?roomId=${appointment.roomId}`}
 className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white transition text-xs sm:text-sm flex-shrink-0"
 >
 <FaVideo className="inline mr-1" />
 <span className="hidden sm:inline">Join</span>
 </Link>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Recent Activity */}
 {data.pastAppointments.length > 0 && (
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg border border-cyan-100">
 <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
 Recent Activity
 </h3>
 <div className="space-y-2 sm:space-y-3">
 {data.pastAppointments.slice(0, 3).map((appointment) => (
 <div
 key={appointment.id}
 className="flex items-center gap-3 md:gap-4 p-3 md:p-4 lg:p-5 bg-white bg-opacity-70 rounded-lg sm:rounded-xl hover:bg-opacity-90 transition"
 >
 <div className="p-1.5 sm:p-2 bg-cyan-100 rounded-lg">
 <FaHistory className="text-cyan-600 text-sm sm:text-base md:text-lg" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-900 text-xs sm:text-sm md:text-base lg:text-lg truncate">
 Consultation with {appointment.patientName}
 </p>
 <p className="text-xs md:text-sm text-gray-600 truncate">
 {new Date(appointment.date).toLocaleDateString()} &bull; {appointment.reason}
 </p>
 </div>
 <span
 className={`px-2 py-0.5 rounded-full text-xs font-medium ${
 appointment.status === 'completed'
 ? 'bg-sky-50 text-green-800'
 : 'bg-sky-50 text-yellow-800'
 }`}
 >
 {appointment.status}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Analytics & Statistics */}
 {data.statistics && (
 <DoctorStatistics doctorData={data.statistics} />
 )}
 </div>
 )
}
