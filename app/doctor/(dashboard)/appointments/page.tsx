'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FaSpinner } from 'react-icons/fa'
import { useDoctorData } from '../context'
import AppointmentScheduler from '../components/AppointmentScheduler'

type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show'
type AppointmentType = 'in-person' | 'video' | 'home-visit'

interface MappedAppointment {
 id: string
 patientName: string
 status: AppointmentStatus
 type: AppointmentType
 date: string
 time: string
 duration: number
 reason: string
 roomId?: string
 location?: string
 notes?: string
}

interface AppointmentsPageData {
 upcomingAppointments: MappedAppointment[]
 pastAppointments: MappedAppointment[]
 todaySchedule: { slots: never[]; totalAppointments: number; availableSlots: number }
 weeklySchedule: never[]
 nextAvailable: string
}

interface ApiAppointment {
 id: string
 patient?: { user: { firstName: string; lastName: string } }
 status: string
 type?: string
 scheduledAt: string
 duration?: number
 reason?: string
 roomId?: string
 location?: string
 notes?: string
}

export default function AppointmentsPage() {
 const user = useDoctorData()
 const router = useRouter()
 const [data, setData] = useState<AppointmentsPageData | null>(null)
 const [loading, setLoading] = useState(true)

 const mapAppointment = (apt: ApiAppointment): MappedAppointment => ({
 id: apt.id,
 patientName: apt.patient
 ? `${apt.patient.user.firstName} ${apt.patient.user.lastName}`
 : 'Unknown',
 status: (apt.status === 'upcoming' ? 'scheduled' : apt.status) as AppointmentStatus,
 type: ((apt.type || '').replace(/_/g, '-') || 'in-person') as AppointmentType,
 date: apt.scheduledAt,
 time: new Date(apt.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
 duration: apt.duration || 30,
 reason: apt.reason || '',
 roomId: apt.roomId,
 location: apt.location,
 notes: apt.notes,
 })

 const fetchAppointments = useCallback(async () => {
 try {
 const [upcomingRes, pastRes] = await Promise.all([
 fetch(`/api/doctors/${user.id}/appointments?status=upcoming`),
 fetch(`/api/doctors/${user.id}/appointments?status=completed`),
 ])
 const [upcoming, past] = await Promise.all([upcomingRes.json(), pastRes.json()])

 setData({
 upcomingAppointments: (upcoming.data || []).map(mapAppointment),
 pastAppointments: (past.data || []).map(mapAppointment),
 todaySchedule: { slots: [], totalAppointments: 0, availableSlots: 0 },
 weeklySchedule: [],
 nextAvailable: '',
 })
 } catch (error) {
 console.error('Failed to fetch appointments:', error)
 setData({
 upcomingAppointments: [],
 pastAppointments: [],
 todaySchedule: { slots: [], totalAppointments: 0, availableSlots: 0 },
 weeklySchedule: [],
 nextAvailable: '',
 })
 } finally {
 setLoading(false)
 }
 }, [user.id])

 useEffect(() => {
 fetchAppointments()
 }, [fetchAppointments])

 if (loading || !data) {
 return (
 <div className="flex items-center justify-center py-20">
 <FaSpinner className="animate-spin text-3xl text-blue-600" />
 </div>
 )
 }

 return (
 <AppointmentScheduler
 doctorData={data}
 onVideoCall={(apt) => {
 if (apt?.roomId) {
 router.push(`/doctor/video?roomId=${apt.roomId}`)
 } else {
 router.push('/doctor/video')
 }
 }}
 />
 )
}
