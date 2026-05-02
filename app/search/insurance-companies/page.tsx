'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FaShieldAlt, FaSearch, FaCheckCircle, FaExclamationCircle, FaArrowLeft } from 'react-icons/fa'

interface InsuranceCompany {
  id: string
  companyName: string
  industry: string | null
  monthlyContribution: number | null
  coverageDescription: string | null
  user: { id: string; firstName: string; lastName: string } | null
}

export default function FindInsuranceCompaniesPage() {
  const [query, setQuery] = useState('')
  const [companies, setCompanies] = useState<InsuranceCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [joinBusyId, setJoinBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/corporate/insurance-companies${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      const json = await res.json()
      setCompanies(json.success && Array.isArray(json.data) ? json.data : [])
    } catch { setCompanies([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const join = async (c: InsuranceCompany) => {
    setJoinBusyId(c.id)
    setToast(null)
    try {
      const res = await fetch(`/api/corporate/insurance/${c.id}/join`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      setToast(json.success
        ? { type: 'ok', msg: `Joined ${c.companyName} — first contribution deducted from wallet` }
        : { type: 'err', msg: json.message || 'Failed to join' })
    } catch {
      setToast({ type: 'err', msg: 'Network error' })
    } finally {
      setJoinBusyId(null)
      setTimeout(() => setToast(null), 4500)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600"><FaArrowLeft /></Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FaShieldAlt className="text-[#0C6780]" /> Find Insurance
        </h1>
      </div>

      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') load() }}
          placeholder="Search insurance companies by name…"
          className="w-full pl-10 pr-24 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0C6780] outline-none"
        />
        <button
          onClick={load}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium bg-[#0C6780] text-white rounded-lg hover:bg-[#0a5568]"
        >Search</button>
      </div>

      {toast && (
        <div className={`text-sm px-4 py-3 rounded-xl border flex items-center gap-2
          ${toast.type === 'ok'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.type === 'ok' ? <FaCheckCircle /> : <FaExclamationCircle />}
          <span>{toast.msg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading insurance companies…</div>
      ) : companies.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <FaShieldAlt className="mx-auto text-4xl text-gray-300" />
          <p className="text-gray-500 text-sm">No insurance companies yet.</p>
          <p className="text-xs text-gray-400">Any user can create one from "My Company" and flag it as an insurance scheme.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <FaShieldAlt className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{c.companyName}</h3>
                  {c.industry && <p className="text-xs text-gray-500">{c.industry}</p>}
                </div>
              </div>
              {c.coverageDescription && (
                <p className="text-xs text-gray-600 line-clamp-2">{c.coverageDescription}</p>
              )}
              <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                <div>
                  <p className="text-xs text-gray-400">Monthly contribution</p>
                  <p className="font-semibold text-gray-900">
                    MUR {(c.monthlyContribution ?? 0).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => join(c)}
                  disabled={joinBusyId === c.id}
                  className="px-4 py-2 bg-[#0C6780] text-white rounded-lg text-xs font-semibold hover:bg-[#0a5568] disabled:opacity-50"
                >
                  {joinBusyId === c.id ? 'Joining…' : 'Join'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
