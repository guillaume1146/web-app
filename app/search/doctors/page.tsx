'use client'

import Link from 'next/link'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { type Doctor } from '@/lib/data'
import dynamic from 'next/dynamic'
import ConnectButton from '@/components/search/ConnectButton'

const CreateBookingModal = dynamic(() => import('@/components/shared/CreateBookingModal'), { ssr: false })
import SearchFilters, { type SearchFilterValues } from '@/components/search/SearchFilters'
import { SearchResultsSkeleton, NoResults } from '@/components/search/SearchResults'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import {
 FaSearch, FaUserMd, FaStar, FaMapMarkerAlt, FaClock,
 FaShieldAlt,
 FaVideo, FaHome, FaLanguage, FaCheckCircle, FaExclamationCircle,
 FaHistory, FaTimes, FaTrash,
} from 'react-icons/fa'

interface DoctorProps {
 doctor: Doctor
 onBook: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
 Specialist: 'bg-purple-100 text-purple-700',
 'General Practice': 'bg-green-100 text-green-700',
 Emergency: 'bg-red-100 text-red-700',
 Surgeon: 'bg-orange-100 text-orange-700',
 'Mental Health': 'bg-blue-100 text-blue-700',
 Dentist: 'bg-teal-100 text-teal-700',
}

const DoctorCard = ({ doctor, onBook }: DoctorProps) => {
 return (
 <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden">
 <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
 {/* Left: Avatar + Info */}
 <div className="flex items-start gap-4 flex-1 min-w-0">
 <div className="relative flex-shrink-0">
 <img
 src={doctor.profileImage}
 alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
 width={56}
 height={56}
 loading="lazy"
 className="rounded-full object-cover border-2 border-blue-100"
 />
 {doctor.verified && (
 <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white rounded-full p-0.5">
 <FaCheckCircle className="text-[10px]" />
 </div>
 )}
 </div>

 <div className="flex-1 min-w-0">
 {/* Name + category */}
 <div className="flex items-center gap-2 mb-0.5 flex-wrap">
 <h3 className="text-sm font-bold text-gray-900 truncate">
 Dr. {doctor.firstName} {doctor.lastName}
 </h3>
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[doctor.category] || 'bg-gray-100 text-gray-700'}`}>
 {doctor.category}
 </span>
 </div>
 <p className="text-xs text-blue-600 font-medium truncate mb-1">
 {doctor.specialty.join(', ')}
 </p>

 {/* Meta row */}
 <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-1.5">
 <span className="flex items-center gap-1">
 <FaStar className="text-yellow-500 text-[10px]" />
 <span className="font-semibold text-gray-700">{doctor.rating}</span>
 <span className="text-gray-400">({doctor.reviews})</span>
 </span>
 <span className="flex items-center gap-1">
 <FaMapMarkerAlt className="text-[10px] text-gray-400" />
 <span className="truncate max-w-[140px]">{doctor.location}</span>
 </span>
 <span className="flex items-center gap-1">
 <FaLanguage className="text-[10px] text-gray-400" />
 <span>{doctor.languages.slice(0, 2).join(', ')}</span>
 {doctor.languages.length > 2 && <span className="text-gray-400">+{doctor.languages.length - 2}</span>}
 </span>
 </div>

 {/* Tags: availability + consultation types */}
 <div className="flex flex-wrap items-center gap-1.5">
 <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
 <FaClock className="text-[8px]" /> {doctor.nextAvailable}
 </span>
 {doctor.consultationTypes.includes('In-Person') && (
 <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
 <FaHome className="text-[8px]" /> In-Person
 </span>
 )}
 {doctor.consultationTypes.includes('Video Consultation') && (
 <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
 <FaVideo className="text-[8px]" /> Video
 </span>
 )}
 {doctor.emergencyAvailable && (
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
 Rs {(doctor.consultationFee ?? 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-400">/session</span>
 </p>
 {(doctor.videoConsultationFee ?? 0) > 0 && (
 <p className="text-[10px] text-gray-400 whitespace-nowrap">
 Video: Rs {(doctor.videoConsultationFee ?? 0).toLocaleString()}
 </p>
 )}
 </div>
 <div className="flex items-center gap-2">
 <Link href={`/search/doctors/${doctor.id}`} className="flex-1 sm:flex-none">
 <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
 Details
 </button>
 </Link>
 <button onClick={onBook} className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors text-center">
 Book
 </button>
 <ConnectButton providerId={doctor.id} className="flex-1 sm:flex-none !px-4 !py-2.5 !text-sm" />
 </div>
 </div>
 </div>
 </div>
 )
}

const DOCTOR_SPECIALTIES = [
 { value: '', label: 'All Specialties' },
 { value: 'cardiology', label: 'Cardiology' },
 { value: 'neurology', label: 'Neurology' },
 { value: 'pediatrics', label: 'Pediatrics' },
 { value: 'orthopedic', label: 'Orthopedic Surgery' },
 { value: 'dermatology', label: 'Dermatology' },
 { value: 'emergency', label: 'Emergency Medicine' },
 { value: 'dentistry', label: 'Dentistry' },
 { value: 'psychiatry', label: 'Psychiatry' },
 { value: 'gastroenterology', label: 'Gastroenterology' },
 { value: 'ophthalmology', label: 'Ophthalmology' },
]

function DoctorsSearchContent() {
 const searchParams = useSearchParams()
 const router = useRouter()
 const pathname = usePathname()

 const initialQuery = searchParams.get('q') || ''
 const initialSpecialty = searchParams.get('specialty') || ''
 const initialCity = searchParams.get('city') || ''
 const initialMinRating = searchParams.get('minRating') || ''
 const initialAvailable = searchParams.get('available') || ''

 const [searchQuery, setSearchQuery] = useState(initialQuery)
 const [filters, setFilters] = useState<SearchFilterValues>({
 type: 'doctors',
 specialty: initialSpecialty,
 city: initialCity,
 minRating: initialMinRating,
 available: initialAvailable,
 })
 const [isLoading, setIsLoading] = useState(true)
 const [searchResults, setSearchResults] = useState<Doctor[]>([])
 const [allDoctors, setAllDoctors] = useState<Doctor[]>([])
 const [hasSearched, setHasSearched] = useState(!!initialQuery || !!initialSpecialty)
 const [showHistory, setShowHistory] = useState(false)
 const [bookingModalOpen, setBookingModalOpen] = useState(false)
 const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null)

 const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory()

 const updateUrl = useCallback((q: string, f: SearchFilterValues) => {
 const params = new URLSearchParams()
 if (q) params.set('q', q)
 if (f.specialty) params.set('specialty', f.specialty)
 if (f.city) params.set('city', f.city)
 if (f.minRating) params.set('minRating', f.minRating)
 if (f.available) params.set('available', f.available)
 const qs = params.toString()
 router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
 }, [router])

 const fetchDoctors = useCallback(async (query = '', specialty = '') => {
 const params = new URLSearchParams()
 if (query) params.set('q', query)
 if (specialty && specialty !== 'all') params.set('specialty', specialty)
 const res = await fetch(`/api/search/doctors?${params.toString()}`)
 const json = await res.json()
 return json.success ? json.data : []
 }, [])

 useEffect(() => {
 fetchDoctors(initialQuery, initialSpecialty).then((data: Doctor[]) => {
 setAllDoctors(data)
 let filtered = data
 // Apply additional client-side filters
 if (initialCity) {
 filtered = filtered.filter(d => d.location.toLowerCase().includes(initialCity.toLowerCase()))
 }
 if (initialMinRating) {
 const min = parseFloat(initialMinRating)
 filtered = filtered.filter(d => d.rating >= min)
 }
 if (initialAvailable === 'true') {
 filtered = filtered.filter(d => d.nextAvailable === 'Available Today' || d.nextAvailable <= new Date().toISOString().split('T')[0])
 }
 setSearchResults(filtered)
 setIsLoading(false)
 })
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 const applyFilters = useCallback((doctors: Doctor[], q: string, f: SearchFilterValues) => {
 let filtered = doctors
 if (q) {
 const lq = q.toLowerCase()
 filtered = filtered.filter(d =>
 d.firstName.toLowerCase().includes(lq) ||
 d.lastName.toLowerCase().includes(lq) ||
 d.specialty.some(s => s.toLowerCase().includes(lq)) ||
 d.location.toLowerCase().includes(lq) ||
 d.bio.toLowerCase().includes(lq) ||
 d.languages.some(l => l.toLowerCase().includes(lq))
 )
 }
 if (f.specialty) {
 filtered = filtered.filter(d =>
 d.specialty.some(s => s.toLowerCase().includes(f.specialty.toLowerCase()))
 )
 }
 if (f.city) {
 filtered = filtered.filter(d => d.location.toLowerCase().includes(f.city.toLowerCase()))
 }
 if (f.minRating) {
 const min = parseFloat(f.minRating)
 filtered = filtered.filter(d => d.rating >= min)
 }
 if (f.available === 'true') {
 filtered = filtered.filter(d => d.nextAvailable === 'Available Today' || d.nextAvailable <= new Date().toISOString().split('T')[0])
 }
 return filtered
 }, [])

 const handleSearch = async (e?: React.FormEvent) => {
 e?.preventDefault()
 setIsLoading(true)
 setHasSearched(true)
 setShowHistory(false)

 const data = await fetchDoctors(searchQuery, filters.specialty)
 setAllDoctors(data)
 const filtered = applyFilters(data, searchQuery, filters)
 setSearchResults(filtered)
 setIsLoading(false)
 updateUrl(searchQuery, filters)

 if (searchQuery.trim()) {
 addToHistory(searchQuery, 'doctors')
 }
 }

 const handleFilterChange = (key: keyof SearchFilterValues, value: string) => {
 const updated = { ...filters, [key]: value }
 setFilters(updated)
 setHasSearched(true)

 // Re-apply all filters client-side
 const filtered = applyFilters(allDoctors, searchQuery, updated)
 setSearchResults(filtered)
 updateUrl(searchQuery, updated)
 }

 const handleClearFilters = () => {
 const cleared: SearchFilterValues = { type: 'doctors', specialty: '', city: '', minRating: '', available: '' }
 setSearchQuery('')
 setFilters(cleared)
 setSearchResults(allDoctors)
 setHasSearched(false)
 router.replace(pathname, { scroll: false })
 }

 const handleHistoryClick = (entry: { query: string }) => {
 setSearchQuery(entry.query)
 setShowHistory(false)
 // Trigger search
 setTimeout(() => {
 const btn = document.getElementById('doctor-search-btn')
 if (btn) btn.click()
 }, 50)
 }

 return (
 <div className="min-h-screen to-white">
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
 placeholder="Describe what you are looking for (e.g., 'heart specialist', 'pediatrician near me', 'doctor for headaches')"
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
 {DOCTOR_SPECIALTIES.map(s => (
 <option key={s.value} value={s.value}>{s.label}</option>
 ))}
 </select>

 <button
 id="doctor-search-btn"
 type="submit"
 disabled={isLoading}
 className="bg-brand-navy text-white px-8 py-2.5 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 min-w-[150px] shadow-lg disabled:opacity-50"
 >
 {isLoading ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
 Searching...
 </>
 ) : (
 <>
 <FaSearch />
 Find Doctors
 </>
 )}
 </button>
 </div>
 </form>

 </div>
 </div>

 {/* Filters + Results */}
 <div className="flex flex-col lg:flex-row gap-6 mt-6">
 <SearchFilters
 filters={filters}
 onFilterChange={handleFilterChange}
 onClearAll={handleClearFilters}
 showTypes={['doctors']}
 specialtyOptions={DOCTOR_SPECIALTIES}
 />

 <div className="flex-1 min-w-0">
 {isLoading ? (
 <SearchResultsSkeleton />
 ) : searchResults.length > 0 ? (
 <>
 {hasSearched && (
 <div className="mb-6 flex items-center justify-between">
 <p className="text-gray-600">
 Found <span className="font-semibold text-gray-900">{searchResults.length}</span> doctors matching your criteria
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
 {searchResults.map((doctor) => (
 <DoctorCard key={doctor.id} doctor={doctor} onBook={() => { setBookingDoctor(doctor); setBookingModalOpen(true) }} />
 ))}
 </div>
 </>
 ) : hasSearched ? (
 <NoResults query={searchQuery} onClear={handleClearFilters} />
 ) : null}
 </div>
 </div>
 </div>

 {/* Booking Modal */}
 {bookingModalOpen && bookingDoctor && (
 <CreateBookingModal
 isOpen={bookingModalOpen}
 onClose={() => { setBookingModalOpen(false); setBookingDoctor(null) }}
 onCreated={() => { setBookingModalOpen(false); setBookingDoctor(null) }}
 defaultProviderType="DOCTOR"
 defaultProvider={{ id: bookingDoctor.id, firstName: bookingDoctor.firstName, lastName: bookingDoctor.lastName }}
 />
 )}
 </div>
 )
}

export default function DoctorsSearchPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen to-white flex items-center justify-center">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 </div>
 }>
 <DoctorsSearchContent />
 </Suspense>
 )
}
