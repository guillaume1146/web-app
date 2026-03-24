'use client'

import { useUser } from '@/hooks/useUser'
import ProviderReviews from '@/components/shared/ProviderReviews'

export default function ResponderReviewsPage() {
 const { user, loading } = useUser()

 if (loading || !user) return null

 return (
 <ProviderReviews
 providerUserId={user.id}
 providerLabel="Emergency Responder"
 headerGradient=" "
 isOwner
 />
 )
}
