'use client'

import Link from 'next/link'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { type Nurse } from '@/lib/data'
import AuthBookingLink from '@/components/booking/AuthBookingLink'
import ConnectButton from '@/components/search/ConnectButton'
import SearchFilters, { type SearchFilterValues } from '@/components/search/SearchFilters'
import { SearchResultsSkeleton, NoResults } from '@/components/search/SearchResults'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import {
  FaSearch, FaUserNurse, FaStar, FaMapMarkerAlt, FaClock, FaShieldAlt,
  FaVideo, FaHome, FaLanguage, FaCheckCircle, FaExclamationCircle,
  FaHistory, FaTimes, FaTrash,
} from 'react-icons/fa'

interface NurseProps {
  nurse: Nurse
}

const NurseCard = ({ nurse }: NurseProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3">
        {/* Left: Avatar + Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src={nurse.profileImage}
              alt={`${nurse.firstName} ${nurse.lastName}`}
              width={48}
              height={48}
              loading="lazy"
              className="rounded-full object-cover border-2 border-teal-100"
            />
            {nurse.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white rounded-full p-0.5">
                <FaCheckCircle className="text-[10px]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900 truncate">
                {nurse.firstName} {nurse.lastName}
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${
                nurse.type === 'Registered Nurse'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : nurse.type === 'Licensed Practical Nurse'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {nurse.type}
              </span>
            </div>
            <p className="text-xs text-blue-600 font-medium truncate mb-1">
              {nurse.specialization.join(', ')}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-1.5">
              <span className="flex items-center gap-1">
                <FaStar className="text-yellow-500 text-[10px]" />
                <span className="font-semibold text-gray-700">{nurse.rating}</span>
                <span className="text-gray-400">({nurse.reviews})</span>
              </span>
              <span className="flex items-center gap-1">
                <FaMapMarkerAlt className="text-[10px] text-gray-400" />
                <span className="truncate max-w-[120px]">{nurse.location}</span>
              </span>
              <span className="flex items-center gap-1">
                <FaLanguage className="text-[10px] text-gray-400" />
                <span>{nurse.languages.slice(0, 2).join(', ')}</span>
                {nurse.languages.length > 2 && <span className="text-gray-400">+{nurse.languages.length - 2}</span>}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <FaClock className="text-[8px]" /> {nurse.nextAvailable}
              </span>
              {nurse.consultationTypes.includes('In-Person') && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                  <FaHome className="text-[8px]" /> In-Person
                </span>
              )}
              {nurse.consultationTypes.includes('Video Consultation') && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                  <FaVideo className="text-[8px]" /> Video
                </span>
              )}
              {nurse.consultationTypes.includes('Home Visit') && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  <FaHome className="text-[8px]" /> Home Visit
                </span>
              )}
              {nurse.emergencyAvailable && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                  <FaExclamationCircle className="text-[8px]" /> Emergency
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Price + Buttons */}
        <div className="flex flex-col items-stretch sm:items-end gap-2 flex-shrink-0 sm:border-l sm:border-gray-100 sm:pl-4 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
          <div className="sm:text-right">
            <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
              Rs {nurse.hourlyRate}/hr
            </p>
            {nurse.videoConsultationRate > 0 && (
              <p className="text-[10px] text-gray-400 whitespace-nowrap">
                Video: Rs {nurse.videoConsultationRate}/hr
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/search/nurses/${nurse.id}`} className="flex-1 sm:flex-none">
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Details
              </button>
            </Link>
            <AuthBookingLink type="nurse" providerId={nurse.id} className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors text-center">
              Book
            </AuthBookingLink>
            <ConnectButton providerId={nurse.id} className="flex-1 sm:flex-none !px-4 !py-2.5 !text-sm" />
          </div>
        </div>
      </div>
    </div>
  )
}

const NURSE_SPECIALTIES = [
  { value: '', label: 'All Specializations' },
  { value: 'elderly', label: 'Elderly Care' },
  { value: 'post-surgery', label: 'Post-Surgery Care' },
  { value: 'child', label: 'Child Care' },
  { value: 'icu', label: 'ICU Care' },
  { value: 'mental-health', label: 'Mental Health' },
  { value: 'cancer', label: 'Cancer Care' },
  { value: 'cardiac', label: 'Cardiac Care' },
  { value: 'maternity', label: 'Labor & Delivery' },
  { value: 'rehabilitation', label: 'Rehabilitation' },
  { value: 'emergency', label: 'Emergency Care' },
]

function NursesSearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const initialQuery = searchParams.get('q') || ''
  const initialSpecialty = searchParams.get('specialization') || searchParams.get('specialty') || ''
  const initialCity = searchParams.get('city') || ''
  const initialMinRating = searchParams.get('minRating') || ''
  const initialAvailable = searchParams.get('available') || ''

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<SearchFilterValues>({
    type: 'nurses',
    specialty: initialSpecialty,
    city: initialCity,
    minRating: initialMinRating,
    available: initialAvailable,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<Nurse[]>([])
  const [allNurses, setAllNurses] = useState<Nurse[]>([])
  const [hasSearched, setHasSearched] = useState(!!initialQuery || !!initialSpecialty)
  const [showHistory, setShowHistory] = useState(false)

  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory()

  const searchExamples = [
    "Find elderly care nurse near me",
    "I need post-surgery care nurse",
    "Looking for pediatric nurse",
    "ICU nurse for critical care",
    "Nurse who speaks French",
    "Home visit nurse available"
  ]

  const updateUrl = useCallback((q: string, f: SearchFilterValues) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (f.specialty) params.set('specialization', f.specialty)
    if (f.city) params.set('city', f.city)
    if (f.minRating) params.set('minRating', f.minRating)
    if (f.available) params.set('available', f.available)
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [router])

  const fetchNurses = useCallback(async (query = '', spec = '') => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (spec && spec !== 'all') params.set('specialization', spec)
    const res = await fetch(`/api/search/nurses?${params.toString()}`)
    const json = await res.json()
    return json.success ? json.data : []
  }, [])

  useEffect(() => {
    fetchNurses(initialQuery, initialSpecialty).then((data: Nurse[]) => {
      setAllNurses(data)
      let filtered = data
      if (initialCity) {
        filtered = filtered.filter(n => n.location.toLowerCase().includes(initialCity.toLowerCase()))
      }
      if (initialMinRating) {
        const min = parseFloat(initialMinRating)
        filtered = filtered.filter(n => n.rating >= min)
      }
      setSearchResults(filtered)
      setIsLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFilters = useCallback((nurses: Nurse[], q: string, f: SearchFilterValues) => {
    let filtered = nurses
    if (q) {
      const lq = q.toLowerCase()
      filtered = filtered.filter(n =>
        n.firstName.toLowerCase().includes(lq) ||
        n.lastName.toLowerCase().includes(lq) ||
        n.specialization.some(s => s.toLowerCase().includes(lq)) ||
        n.location.toLowerCase().includes(lq) ||
        n.bio.toLowerCase().includes(lq)
      )
    }
    if (f.specialty) {
      filtered = filtered.filter(n =>
        n.specialization.some(s => s.toLowerCase().includes(f.specialty.toLowerCase()))
      )
    }
    if (f.city) {
      filtered = filtered.filter(n => n.location.toLowerCase().includes(f.city.toLowerCase()))
    }
    if (f.minRating) {
      const min = parseFloat(f.minRating)
      filtered = filtered.filter(n => n.rating >= min)
    }
    return filtered
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setIsLoading(true)
    setHasSearched(true)
    setShowHistory(false)

    const data = await fetchNurses(searchQuery, filters.specialty)
    setAllNurses(data)
    const filtered = applyFilters(data, searchQuery, filters)
    setSearchResults(filtered)
    setIsLoading(false)
    updateUrl(searchQuery, filters)

    if (searchQuery.trim()) {
      addToHistory(searchQuery, 'nurses')
    }
  }

  const handleFilterChange = (key: keyof SearchFilterValues, value: string) => {
    const updated = { ...filters, [key]: value }
    setFilters(updated)
    setHasSearched(true)

    const filtered = applyFilters(allNurses, searchQuery, updated)
    setSearchResults(filtered)
    updateUrl(searchQuery, updated)
  }

  const handleClearFilters = () => {
    const cleared: SearchFilterValues = { type: 'nurses', specialty: '', city: '', minRating: '', available: '' }
    setSearchQuery('')
    setFilters(cleared)
    setSearchResults(allNurses)
    setHasSearched(false)
    router.replace(pathname, { scroll: false })
  }

  const handleExampleClick = (example: string) => {
    setSearchQuery(example)
  }

  const handleHistoryClick = (entry: { query: string }) => {
    setSearchQuery(entry.query)
    setShowHistory(false)
    setTimeout(() => {
      const btn = document.getElementById('nurse-search-btn')
      if (btn) btn.click()
    }, 50)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="relative z-10">
          <div className="bg-white rounded-xl shadow-xl p-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowHistory(true) }}
                  onFocus={() => !searchQuery && setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                  placeholder="Describe what you are looking for (e.g., 'elderly care nurse', 'post-surgery care', 'pediatric nurse')"
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-base"
                />
                <FaSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />

                {/* Search History Dropdown */}
                {showHistory && history.length > 0 && !searchQuery && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                        <FaHistory className="text-[10px]" />
                        Recent Searches
                      </span>
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => clearHistory()}
                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                      >
                        <FaTrash className="text-[10px]" />
                        Clear
                      </button>
                    </div>
                    {history.map((entry, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleHistoryClick(entry)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition text-sm text-gray-700 group"
                      >
                        <span className="flex items-center gap-2">
                          <FaHistory className="text-xs text-gray-300" />
                          {entry.query}
                        </span>
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={e => { e.stopPropagation(); removeFromHistory(entry.query) }}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <select
                  value={filters.specialty}
                  onChange={(e) => handleFilterChange('specialty', e.target.value)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {NURSE_SPECIALTIES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <button
                  id="nurse-search-btn"
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center justify-center gap-2 min-w-[150px] shadow-lg disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <FaSearch />
                      Find Nurses
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Search Examples */}
            {!hasSearched && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-3">Try searching for:</p>
                <div className="flex flex-wrap gap-2">
                  {searchExamples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics (computed from actual data) */}
        {(() => {
          const avgRating = allNurses.length > 0
            ? (allNurses.reduce((sum, n) => sum + (n.rating || 0), 0) / allNurses.length).toFixed(1)
            : '0.0'
          const verifiedPct = allNurses.length > 0
            ? Math.round((allNurses.filter(n => n.verified).length / allNurses.length) * 100)
            : 0
          const totalReviews = allNurses.reduce((sum, n) => sum + (n.reviews || 0), 0)
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 mb-8">
              <div className="bg-white rounded-lg shadow p-4 text-center border border-blue-100">
                <FaUserNurse className="text-3xl text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{allNurses.length}</p>
                <p className="text-sm text-gray-600">Verified Nurses</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center border border-green-100">
                <FaStar className="text-3xl text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{avgRating}</p>
                <p className="text-sm text-gray-600">Average Rating</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center border border-purple-100">
                <FaShieldAlt className="text-3xl text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{verifiedPct}%</p>
                <p className="text-sm text-gray-600">Verified & Licensed</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center border border-orange-100">
                <FaCheckCircle className="text-3xl text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{totalReviews.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Patient Reviews</p>
              </div>
            </div>
          )
        })()}

        {/* Filters + Results */}
        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          <SearchFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearFilters}
            showTypes={['nurses']}
            specialtyOptions={NURSE_SPECIALTIES}
          />

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <SearchResultsSkeleton />
            ) : searchResults.length > 0 ? (
              <>
                {hasSearched && (
                  <div className="mb-6 flex items-center justify-between">
                    <p className="text-gray-600">
                      Found <span className="font-semibold text-gray-900">{searchResults.length}</span> nurses matching your criteria
                    </p>
                    <button
                      onClick={handleClearFilters}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear filters
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  {searchResults.map((nurse) => (
                    <NurseCard key={nurse.id} nurse={nurse} />
                  ))}
                </div>
              </>
            ) : hasSearched ? (
              <NoResults query={searchQuery} onClear={handleClearFilters} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NursesSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NursesSearchContent />
    </Suspense>
  )
}
