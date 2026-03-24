'use client'

import { useDoctorData } from '../context'
import UserProfile from '@/components/profile/UserProfile'

export default function ProfilePage() {
 const user = useDoctorData()
 return <UserProfile userId={user.id} userType="DOCTOR" settingsPath="/doctor/profile" />
}
