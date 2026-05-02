/**
 * Client-side notification service.
 */

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const res = await fetch(`/api/users/${userId}/notifications`, { credentials: 'include' })
  if (!res.ok) return []
  const data = await res.json()
  return data.success ? data.data : []
}

export async function markNotificationsRead(
  userId: string,
  notificationIds: string[]
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/users/${userId}/notifications`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: notificationIds }),
    credentials: 'include',
  })
  return res.json()
}
