'use client'

import ProviderSearchPage from '@/components/search/ProviderSearchPage'

export default function DoctorSearchPage() {
  return (
    <ProviderSearchPage
      config={{
        providerType: 'DOCTOR',
        title: 'Find Doctors',
        singularLabel: 'Doctor',
        slug: 'doctors',
      }}
    />
  )
}
