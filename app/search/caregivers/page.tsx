'use client'

import ProviderSearchPage from '@/components/search/ProviderSearchPage'

export default function SearchCaregiversPage() {
  return (
    <ProviderSearchPage config={{
      providerType: 'CAREGIVER',
      title: 'Find Caregivers',
      singularLabel: 'Caregiver',
      slug: 'caregivers',
      accentColor: 'border-pink-100',
    }} />
  )
}
