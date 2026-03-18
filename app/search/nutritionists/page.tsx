'use client'

import ProviderSearchPage from '@/components/search/ProviderSearchPage'

export default function SearchNutritionistsPage() {
  return (
    <ProviderSearchPage config={{
      providerType: 'NUTRITIONIST',
      title: 'Find Nutritionists',
      singularLabel: 'Nutritionist',
      slug: 'nutritionists',
      accentColor: 'border-orange-100',
    }} />
  )
}
