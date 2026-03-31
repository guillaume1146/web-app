'use client'

import { useState, useEffect } from 'react'
import { FaInfoCircle, FaUser } from 'react-icons/fa'
import * as FaIcons from 'react-icons/fa'
import { userTypes as staticUserTypes, documentRequirements as staticDocReqs } from './constants'
import type { UserType, Document } from './types'

interface RoleFromAPI {
  code: string
  label: string
  singularLabel: string
  slug: string
  icon: string
  color: string
  description: string | null
  cookieValue: string | null
  verificationDocs: { documentName: string; description: string | null; isRequired: boolean }[]
}

// Map API color hex to Tailwind classes
function colorToTailwind(hex: string): string {
  const map: Record<string, string> = {
    '#0C6780': 'bg-teal-100 text-teal-700 border-teal-300',
    '#001E40': 'bg-blue-100 text-blue-700 border-blue-300',
    '#9AE1FF': 'bg-sky-100 text-sky-700 border-sky-300',
    '#22c55e': 'bg-green-100 text-green-700 border-green-300',
    '#8b5cf6': 'bg-purple-100 text-purple-700 border-purple-300',
    '#ec4899': 'bg-pink-100 text-pink-700 border-pink-300',
    '#ef4444': 'bg-red-100 text-red-700 border-red-300',
    '#f97316': 'bg-orange-100 text-orange-700 border-orange-300',
    '#6366f1': 'bg-indigo-100 text-indigo-700 border-indigo-300',
  }
  return map[hex] || 'bg-gray-100 text-gray-700 border-gray-300'
}

function mapAPIToUserTypes(roles: RoleFromAPI[]): { types: UserType[]; docs: Record<string, Document[]> } {
  const types: UserType[] = []
  const docs: Record<string, Document[]> = {}

  for (const role of roles) {
    const id = role.cookieValue || role.slug
    const IconComponent = (FaIcons as Record<string, React.ComponentType>)[role.icon] || FaUser

    types.push({
      id,
      label: role.singularLabel || role.label,
      icon: IconComponent,
      description: role.description || role.label,
      color: colorToTailwind(role.color),
    })

    if (role.verificationDocs?.length > 0) {
      docs[id] = role.verificationDocs.map((doc, i) => ({
        id: `${id}-doc-${i}`,
        name: doc.documentName,
        description: doc.description || '',
        required: doc.isRequired,
        accepted: '.pdf,.jpg,.jpeg,.png',
      }))
    }
  }

  return { types, docs }
}

interface AccountTypeStepProps {
  selectedUserType: string
  onUserTypeChange: (userTypeId: string) => void
}

export default function AccountTypeStep({ selectedUserType, onUserTypeChange }: AccountTypeStepProps) {
  const [userTypes, setUserTypes] = useState<UserType[]>(staticUserTypes)
  const [documentRequirements, setDocumentRequirements] = useState<Record<string, Document[]>>(staticDocReqs)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/roles?all=true')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.length > 0) {
          const { types, docs } = mapAPIToUserTypes(json.data)
          if (types.length > 0) {
            setUserTypes(types)
            setDocumentRequirements(prev => ({ ...prev, ...docs }))
          }
        }
      })
      .catch(() => {
        // Keep static fallback
      })
      .finally(() => setLoading(false))
  }, [])

  const selectedType = userTypes.find(type => type.id === selectedUserType)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Account Type</h2>
      <p className="text-gray-600 mb-8">Choose the type of account that best describes your role in healthcare</p>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-6 border-2 border-gray-200 rounded-2xl animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded mb-4" />
              <div className="h-5 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-36" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userTypes.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => onUserTypeChange(type.id)}
                className={`p-6 border-2 rounded-2xl text-left transition-all hover:shadow-lg ${
                  selectedUserType === type.id
                    ? `${type.color} border-current shadow-lg`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`text-3xl mb-4 ${
                  selectedUserType === type.id ? '' : 'text-gray-400'
                }`} />
                <h3 className="font-bold text-lg mb-2">{type.label}</h3>
                <p className="text-sm text-gray-600">{type.description}</p>
              </button>
            )
          })}
        </div>
      )}

      {selectedUserType && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-4">
            <FaInfoCircle className="text-blue-600 mt-1" />
            <div>
              <h4 className="font-bold text-blue-800 mb-2">Required Documents for {selectedType?.label}</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                {documentRequirements[selectedUserType]?.filter(doc => doc.required).map(doc => (
                  <li key={doc.id}>• {doc.name}</li>
                ))}
              </ul>
              <p className="text-blue-600 text-xs mt-2">
                You will upload these documents in the next steps. Make sure you have them ready.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
