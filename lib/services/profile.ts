/**
 * Client-side profile service.
 * Centralizes user profile API calls.
 */

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  profileImage?: string
  userType: string
  verified?: boolean
  [key: string]: unknown
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const res = await fetch(`/api/users/${userId}`, { credentials: 'include' })
  if (!res.ok) return null
  const data = await res.json()
  return data.success ? data.data : null
}

export async function updateUserProfile(
  userId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    credentials: 'include',
  })
  return res.json()
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`/api/users/${userId}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
    credentials: 'include',
  })
  return res.json()
}
