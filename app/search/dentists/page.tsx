'use client'

import ProviderSearchPage from '@/components/search/ProviderSearchPage'

export default function SearchDentistsPage() {
 return (
 <ProviderSearchPage config={{
 providerType: 'DENTIST',
 title: 'Find Dentists',
 singularLabel: 'Dentist',
 slug: 'dentists',
 accentColor: 'border-sky-100',
 }} />
 )
}
