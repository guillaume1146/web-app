'use client'

import { usePatientData } from '../context'
import UserProfile from '@/components/profile/UserProfile'

export default function PatientProfilePage() {
 const user = usePatientData()
 return <UserProfile userId={user.id} userType="PATIENT" settingsPath="/patient/profile" />
}
