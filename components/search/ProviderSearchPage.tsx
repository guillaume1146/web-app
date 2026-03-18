'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ConnectButton from '@/components/search/ConnectButton'
import { SearchResultsSkeleton, NoResults } from '@/components/search/SearchResults'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import {
  FaSearch, FaMapMarkerAlt, FaCheckCircle,
  FaVideo, FaHome, FaClock,
  FaHistory, FaTimes, FaTrash,
} from 'react-icons/fa'

const CreateBookingModal = dynamic(() => import('@/components/shared/CreateBookingModal'), { ssr: false })

interface Provider {
  id: string
  firstName: string
  lastName: string
  profileImage: string | null
  address: string | null
  verified: boolean
  specializations: string[]
}

interface ProviderSearchPageConfig {
  providerType: string
  title: string
  singularLabel: string
  slug: string
  accentColor?: string
}

const ProviderCard = ({ provider, slug, accentColor, onBook }: { provider: Provider; slug: string; accentColor: string; onBook: () => void }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            {provider.profileImage ? (
              <img src={provider.profileImage} alt={`${provider.firstName} ${provider.lastName}`}
                width={48} height={48} loading="lazy"
                className={`rounded-full object-cover border-2 ${accentColor}`} />
            ) : (
              <div className={`w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 ${accentColor}`}>
                {provider.firstName[0]}{provider.lastName[0]}
              </div>
            )}
            {provider.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white rounded-full p-0.5">
                <FaCheckCircle className="text-[10px]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {provider.firstName} {provider.lastName}
            </h3>
            {provider.specializations.length > 0 && (
              <p className="text-xs text-blue-600 font-medium truncate mb-1">
                {provider.specializations.join(', ')}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-1.5">
              {provider.address && (
                <span className="flex items-center gap-1">
                  <FaMapMarkerAlt className="text-[10px] text-gray-400" />
                  <span className="truncate max-w-[160px]">{provider.address}</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                <FaHome className="text-[8px]" /> In-Person
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                <FaVideo className="text-[8px]" /> Video
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <FaClock className="text-[8px]" /> Available
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-2 flex-shrink-0 sm:border-l sm:border-gray-100 sm:pl-4 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
          <div className="flex items-center gap-2">
            <Link href={`/search/${slug}/${provider.id}`} className="flex-1 sm:flex-none">
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                Details
              </button>
            </Link>
            <button onClick={onBook}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors text-center">
              Book
            </button>
            <ConnectButton providerId={provider.id} className="flex-1 sm:flex-none !px-3 !py-2 !text-xs" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProviderSearchContent({ config }: { config: ProviderSearchPageConfig }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const initialQuery = searchParams.get('q') || ''
  const initialSpecialty = searchParams.get('specialty') || ''

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [isLoading, setIsLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<Provider[]>([])
  const [allProviders, setAllProviders] = useState<Provider[]>([])
  const [hasSearched, setHasSearched] = useState(!!initialQuery)
  const [showHistory, setShowHistory] = useState(false)

  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null)

  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory()

  const fetchProviders = useCallback(async (query = '') => {
    const params = new URLSearchParams({ type: config.providerType })
    if (query) params.set('q', query)
    const res = await fetch(`/api/search/providers?${params.toString()}`)
    const json = await res.json()
    return json.success ? json.data : []
  }, [config.providerType])

  useEffect(() => {
    fetchProviders(initialQuery).then((data: Provider[]) => {
      setAllProviders(data)
      let filtered = data
      if (initialSpecialty) {
        filtered = filtered.filter(p =>
          p.specializations.some(s => s.toLowerCase().includes(initialSpecialty.toLowerCase()))
        )
      }
      setSearchResults(filtered)
      setIsLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFilters = useCallback((providers: Provider[], q: string) => {
    if (!q) return providers
    const lq = q.toLowerCase()
    return providers.filter(p =>
      p.firstName.toLowerCase().includes(lq) ||
      p.lastName.toLowerCase().includes(lq) ||
      p.specializations.some(s => s.toLowerCase().includes(lq)) ||
      (p.address || '').toLowerCase().includes(lq)
    )
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setIsLoading(true)
    setHasSearched(true)
    setShowHistory(false)

    const data = await fetchProviders(searchQuery)
    setAllProviders(data)
    const filtered = applyFilters(data, searchQuery)
    setSearchResults(filtered)
    setIsLoading(false)

    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })

    if (searchQuery.trim()) {
      addToHistory(searchQuery, config.slug)
    }
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSearchResults(allProviders)
    setHasSearched(false)
    router.replace(pathname, { scroll: false })
  }

  const handleHistoryClick = (entry: { query: string }) => {
    setSearchQuery(entry.query)
    setShowHistory(false)
    setTimeout(() => {
      const btn = document.getElementById(`${config.slug}-search-btn`)
      if (btn) btn.click()
    }, 50)
  }

  const handleBook = (provider: Provider) => {
    setBookingProvider(provider)
    setBookingModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="relative z-10">
          <div className="bg-white rounded-xl shadow-xl p-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowHistory(true) }}
                  onFocus={() => !searchQuery && setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                  placeholder={`Search ${config.singularLabel.toLowerCase()}s by name, specialty, or location...`}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-base"
                />
                <FaSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />

                {/* Search History Dropdown */}
                {showHistory && history.length > 0 && !searchQuery && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                        <FaHistory className="text-[10px]" /> Recent Searches
                      </span>
                      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => clearHistory()}
                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                        <FaTrash className="text-[10px]" /> Clear
                      </button>
                    </div>
                    {history.map((entry, i) => (
                      <button key={i} type="button" onMouseDown={e => e.preventDefault()} onClick={() => handleHistoryClick(entry)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition text-sm text-gray-700 group">
                        <span className="flex items-center gap-2">
                          <FaHistory className="text-xs text-gray-300" /> {entry.query}
                        </span>
                        <button type="button" onMouseDown={e => e.preventDefault()}
                          onClick={e => { e.stopPropagation(); removeFromHistory(entry.query) }}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                          <FaTimes className="text-xs" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                id={`${config.slug}-search-btn`}
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 whitespace-nowrap"
              >
                {isLoading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Searching...</>
                ) : (
                  <><FaSearch /> Search</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-8 mb-8">
          <div className="bg-white rounded-lg shadow p-4 text-center border border-blue-100">
            <p className="text-2xl font-bold text-gray-900">{allProviders.length}</p>
            <p className="text-sm text-gray-600">{config.title.replace('Find ', '')}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center border border-green-100">
            <p className="text-2xl font-bold text-gray-900">{allProviders.filter(p => p.verified).length}</p>
            <p className="text-sm text-gray-600">Verified</p>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <SearchResultsSkeleton />
          ) : searchResults.length > 0 ? (
            <>
              {hasSearched && (
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-gray-600">
                    Found <span className="font-semibold text-gray-900">{searchResults.length}</span> {config.singularLabel.toLowerCase()}s matching your criteria
                  </p>
                  <button onClick={handleClearFilters} className="text-blue-600 hover:text-blue-700 font-medium">
                    Clear filters
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-4">
                {searchResults.map(provider => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    slug={config.slug}
                    accentColor={config.accentColor || 'border-blue-100'}
                    onBook={() => handleBook(provider)}
                  />
                ))}
              </div>
            </>
          ) : hasSearched ? (
            <NoResults query={searchQuery} onClear={handleClearFilters} />
          ) : null}
        </div>
      </div>

      {/* Booking Modal — opens with provider pre-selected */}
      {bookingModalOpen && bookingProvider && (
        <CreateBookingModal
          isOpen={bookingModalOpen}
          onClose={() => { setBookingModalOpen(false); setBookingProvider(null) }}
          onCreated={() => { setBookingModalOpen(false); setBookingProvider(null) }}
          defaultProviderType={config.providerType}
          defaultProvider={{ id: bookingProvider.id, firstName: bookingProvider.firstName, lastName: bookingProvider.lastName }}
        />
      )}
    </div>
  )
}

export default function ProviderSearchPage({ config }: { config: ProviderSearchPageConfig }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <ProviderSearchContent config={config} />
    </Suspense>
  )
}
