'use client'

import ProviderSearchPage from '@/components/search/ProviderSearchPage'

export default function SearchOptometristsPage() {
  return (
    <ProviderSearchPage config={{
      providerType: 'OPTOMETRIST',
      title: 'Find Optometrists',
      singularLabel: 'Optometrist',
      slug: 'optometrists',
      accentColor: 'border-violet-100',
    }} />
  )
}
