'use client'

import { use } from 'react'
import ProviderBookingsList from '@/components/workflow/ProviderBookingsList'

export default function BookingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  return <ProviderBookingsList basePath={`/provider/${slug}`} defaultActiveOnly />
}
