'use client'

import ProviderSearchPage from '@/components/search/ProviderSearchPage'

export default function NurseSearchPage() {
  return (
    <ProviderSearchPage
      config={{
        providerType: 'NURSE',
        title: 'Find Nurses',
        singularLabel: 'Nurse',
        slug: 'nurses',
      }}
    />
  )
}
