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
      searchExamples: [
        'Elder care specialist near me',
        'Dementia companion care',
        'Post-surgery home aide',
        'Disability care specialist',
      ],
    }} />
  )
}
