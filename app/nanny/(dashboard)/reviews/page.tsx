'use client'

import ProviderReviews from '@/components/shared/ProviderReviews'
import { useUser } from '@/hooks/useUser'

export default function NannyReviewsPage() {
 const { user, loading } = useUser()

 if (loading || !user) return null

 return (
 <ProviderReviews
 providerUserId={user.id}
 providerLabel="Childcare Provider"
 headerGradient=" "
 isOwner
 />
 )
}
