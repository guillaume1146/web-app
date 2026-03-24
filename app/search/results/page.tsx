'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
 FaSearch, FaArrowLeft, FaSpinner, FaHistory, FaTimes, FaTrash,
} from 'react-icons/fa'
import SearchFilters, { type SearchFilterValues } from '@/components/search/SearchFilters'
import SearchResults from '@/components/search/SearchResults'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import type { UnifiedSearchResult } from '@/app/api/search/route'

function SearchResultsContent() {
 const searchParams = useSearchParams()
 const router = useRouter()
 const pathname = usePathname()

 // Read initial values from URL params
 const initialQuery = searchParams.get('q') || ''
 const initialType = searchParams.get('type') || 'all'
 const initialSpecialty = searchParams.get('specialty') || ''
 const initialCity = searchParams.get('city') || ''
 const initialMinRating = searchParams.get('minRating') || ''
 const initialAvailable = searchParams.get('available') || ''
 const initialPage = parseInt(searchParams.get('page') || '1')

 const [query, setQuery] = useState(initialQuery)
 const [filters, setFilters] = useState<SearchFilterValues>({
 type: initialType,
 specialty: initialSpecialty,
 city: initialCity,
 minRating: initialMinRating,
 available: initialAvailable,
 })
 const [page, setPage] = useState(initialPage)
 const [results, setResults] = useState<UnifiedSearchResult[]>([])
 const [total, setTotal] = useState(0)
 const [totalPages, setTotalPages] = useState(0)
 const [loading, setLoading] = useState(true)
 const [showHistory, setShowHistory] = useState(false)

 const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory()

 // Build URL params and navigate
 const updateUrl = useCallback((q: string, f: SearchFilterValues, p: number) => {
 const params = new URLSearchParams()
 if (q) params.set('q', q)
 if (f.type && f.type !== 'all') params.set('type', f.type)
 if (f.specialty) params.set('specialty', f.specialty)
 if (f.city) params.set('city', f.city)
 if (f.minRating) params.set('minRating', f.minRating)
 if (f.available) params.set('available', f.available)
 if (p > 1) params.set('page', String(p))
 router.replace(`${pathname}?${params.toString()}`, { scroll: false })
 }, [router])

 // Fetch results from unified API
 const fetchResults = useCallback(async (q: string, f: SearchFilterValues, p: number) => {
 setLoading(true)
 try {
 const params = new URLSearchParams()
 if (q) params.set('q', q)
 if (f.type && f.type !== 'all') params.set('type', f.type)
 if (f.specialty) params.set('specialty', f.specialty)
 if (f.city) params.set('city', f.city)
 if (f.minRating) params.set('minRating', f.minRating)
 if (f.available) params.set('available', f.available)
 params.set('page', String(p))
 params.set('limit', '12')

 const res = await fetch(`/api/search?${params.toString()}`)
 if (res.ok) {
 const data = await res.json()
 if (data.success) {
 setResults(data.data)
 setTotal(data.total)
 setTotalPages(data.totalPages)
 }
 }
 } catch {
 // fail silently
 } finally {
 setLoading(false)
 }
 }, [])

 // Initial fetch
 useEffect(() => {
 fetchResults(initialQuery, filters, page)
 if (initialQuery) {
 addToHistory(initialQuery, filters.type)
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 // Handle search submit
 const handleSearch = (e?: React.FormEvent) => {
 e?.preventDefault()
 setPage(1)
 fetchResults(query, filters, 1)
 updateUrl(query, filters, 1)
 setShowHistory(false)
 if (query.trim()) {
 addToHistory(query, filters.type)
 }
 }

 // Handle filter change
 const handleFilterChange = (key: keyof SearchFilterValues, value: string) => {
 const updated = { ...filters, [key]: value }
 setFilters(updated)
 setPage(1)
 fetchResults(query, updated, 1)
 updateUrl(query, updated, 1)
 }

 // Handle clear all filters
 const handleClearAll = () => {
 const cleared: SearchFilterValues = { type: 'all', specialty: '', city: '', minRating: '', available: '' }
 setFilters(cleared)
 setQuery('')
 setPage(1)
 fetchResults('', cleared, 1)
 updateUrl('', cleared, 1)
 }

 // Handle page change
 const handlePageChange = (newPage: number) => {
 setPage(newPage)
 fetchResults(query, filters, newPage)
 updateUrl(query, filters, newPage)
 window.scrollTo({ top: 0, behavior: 'smooth' })
 }

 // Handle history item click
 const handleHistoryClick = (entry: { query: string; type: string }) => {
 setQuery(entry.query)
 const updated = { ...filters, type: entry.type }
 setFilters(updated)
 setPage(1)
 fetchResults(entry.query, updated, 1)
 updateUrl(entry.query, updated, 1)
 setShowHistory(false)
 }

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header */}
 <div className="bg-white border-b border-gray-200 py-6 sm:py-8">
 <div className="container mx-auto px-4">
 <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-3 text-sm">
 <FaArrowLeft /> Back to Home
 </Link>
 <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
 Search Healthcare Services
 </h1>

 {/* Search input */}
 <form onSubmit={handleSearch} className="relative max-w-2xl">
 <div className="relative">
 <input
 type="text"
 value={query}
 onChange={e => { setQuery(e.target.value); setShowHistory(true) }}
 onFocus={() => setShowHistory(true)}
 onBlur={() => setTimeout(() => setShowHistory(false), 200)}
 placeholder="Search doctors, nurses, medicines..."
 className="w-full px-5 py-3.5 pr-12 rounded-xl text-gray-800 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-sm"
 autoComplete="off"
 />
 {query && (
 <button
 type="button"
 onClick={() => { setQuery(''); setShowHistory(false) }}
 className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
 >
 <FaTimes className="text-sm" />
 </button>
 )}
 <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition">
 <FaSearch className="text-sm" />
 </button>
 </div>

 {/* Search History Dropdown */}
 {showHistory && history.length > 0 && !query && (
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
 {entry.type !== 'all' && (
 <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{entry.type}</span>
 )}
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
 </form>
 </div>
 </div>

 {/* Body */}
 <div className="container mx-auto px-4 py-6">
 <div className="flex flex-col lg:flex-row gap-6">
 {/* Filters */}
 <SearchFilters
 filters={filters}
 onFilterChange={handleFilterChange}
 onClearAll={handleClearAll}
 />

 {/* Results */}
 <div className="flex-1 min-w-0">
 <SearchResults
 results={results}
 total={total}
 page={page}
 totalPages={totalPages}
 loading={loading}
 query={query}
 onPageChange={handlePageChange}
 onClear={handleClearAll}
 />
 </div>
 </div>
 </div>
 </div>
 )
}

export default function SearchResultsPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-gray-50 flex items-center justify-center">
 <FaSpinner className="animate-spin text-3xl text-blue-600" />
 </div>
 }>
 <SearchResultsContent />
 </Suspense>
 )
}
