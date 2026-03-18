'use client'

import ProviderSearchPage from '@/components/search/ProviderSearchPage'

export default function SearchPhysiotherapistsPage() {
  return (
    <ProviderSearchPage config={{
      providerType: 'PHYSIOTHERAPIST',
      title: 'Find Physiotherapists',
      singularLabel: 'Physiotherapist',
      slug: 'physiotherapists',
      accentColor: 'border-lime-100',
      searchExamples: [
        'Sports injury rehabilitation',
        'Back pain physiotherapy',
        'Post-surgery rehab specialist',
        'Orthopedic physiotherapist',
      ],
    }} />
  )
}
