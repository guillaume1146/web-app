'use client'

import { useUser } from '@/hooks/useUser'
import UserProfile from '@/components/profile/UserProfile'

export default function ProfilePage() {
  const { user, loading } = useUser()

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0C6780]" />
      </div>
    )
  }

  return <UserProfile userId={user.id} userType={user.userType} settingsPath="/profile" />
}
