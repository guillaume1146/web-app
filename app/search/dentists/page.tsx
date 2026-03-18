'use client'

import { useState, useEffect } from 'react'
import { FaSpinner, FaMapMarkerAlt } from 'react-icons/fa'

interface Provider {
  id: string
  firstName: string
  lastName: string
  profileImage: string | null
  address: string | null
  specializations: string[]
}

export default function SearchDentistsPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/search/providers?type=DENTIST')
      .then(r => r.json())
      .then(json => { if (json.success) setProviders(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-500 text-2xl" /></div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Find Dentists</h1>
      {providers.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No dentists available yet. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {p.firstName[0]}{p.lastName[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.firstName} {p.lastName}</h3>
                  {p.address && <p className="text-xs text-gray-500 flex items-center gap-1"><FaMapMarkerAlt />{p.address}</p>}
                </div>
              </div>
              {p.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.specializations.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
