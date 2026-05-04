'use client'

import { useState, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { FaSearch, FaTimes } from 'react-icons/fa'

// ─── Curated medical icon sets ────────────────────────────────────────────────

const HEALTHICONS: { key: string; label: string }[] = [
  { key: 'healthicons:doctor', label: 'Doctor' },
  { key: 'healthicons:nurse', label: 'Nurse' },
  { key: 'healthicons:dentistry', label: 'Dentist' },
  { key: 'healthicons:optometry', label: 'Optometry' },
  { key: 'healthicons:physiotherapy', label: 'Physiotherapy' },
  { key: 'healthicons:pharmacy', label: 'Pharmacy' },
  { key: 'healthicons:laboratory', label: 'Laboratory' },
  { key: 'healthicons:ambulance', label: 'Ambulance' },
  { key: 'healthicons:community-health-worker', label: 'Community Worker' },
  { key: 'healthicons:child-programme', label: 'Child Programme' },
  { key: 'healthicons:nutrition-care', label: 'Nutrition Care' },
  { key: 'healthicons:stethoscope', label: 'Stethoscope' },
  { key: 'healthicons:heart-cardiogram', label: 'Cardiology' },
  { key: 'healthicons:medicines', label: 'Medicines' },
  { key: 'healthicons:surgical', label: 'Surgical' },
  { key: 'healthicons:blood-drop', label: 'Blood Drop' },
  { key: 'healthicons:microscopy-slides', label: 'Microscopy' },
  { key: 'healthicons:vaccines', label: 'Vaccines' },
  { key: 'healthicons:pregnancy', label: 'Pregnancy' },
  { key: 'healthicons:baby-0-2m', label: 'Newborn' },
  { key: 'healthicons:old-man', label: 'Elderly' },
  { key: 'healthicons:mental-health', label: 'Mental Health' },
  { key: 'healthicons:diabetes', label: 'Diabetes' },
  { key: 'healthicons:oxygen', label: 'Oxygen' },
  { key: 'healthicons:eye-health', label: 'Eye Health' },
  { key: 'healthicons:ear', label: 'Ear / ENT' },
  { key: 'healthicons:bone', label: 'Orthopaedics' },
  { key: 'healthicons:surgical-knife', label: 'Surgery' },
  { key: 'healthicons:home-visits', label: 'Home Visit' },
  { key: 'healthicons:telemedicine', label: 'Telemedicine' },
  { key: 'healthicons:emergency-response', label: 'Emergency' },
  { key: 'healthicons:cancer-tumor', label: 'Oncology' },
  { key: 'healthicons:kidney-disease', label: 'Nephrology' },
  { key: 'healthicons:liver', label: 'Hepatology' },
  { key: 'healthicons:gastrointestinal', label: 'Gastroenterology' },
  { key: 'healthicons:dermatology', label: 'Dermatology' },
  { key: 'healthicons:chest-x-ray', label: 'Radiology / X-Ray' },
  { key: 'healthicons:ultrasound', label: 'Ultrasound' },
  { key: 'healthicons:mri', label: 'MRI' },
  { key: 'healthicons:wound-care', label: 'Wound Care' },
  { key: 'healthicons:rehabilitation', label: 'Rehabilitation' },
  { key: 'healthicons:hygiene', label: 'Hygiene' },
  { key: 'healthicons:health-education', label: 'Health Education' },
  { key: 'healthicons:outpatient', label: 'Outpatient' },
  { key: 'healthicons:inpatient', label: 'Inpatient' },
  { key: 'healthicons:referral', label: 'Referral' },
  { key: 'healthicons:health-insurance', label: 'Health Insurance' },
  { key: 'healthicons:pills', label: 'Pills' },
  { key: 'healthicons:syringe', label: 'Syringe' },
  { key: 'healthicons:blood-pressure', label: 'Blood Pressure' },
]

const PHOSPHOR: { key: string; label: string }[] = [
  { key: 'ph:stethoscope-duotone', label: 'Stethoscope' },
  { key: 'ph:heartbeat-duotone', label: 'Heartbeat' },
  { key: 'ph:heart-duotone', label: 'Heart' },
  { key: 'ph:brain-duotone', label: 'Brain' },
  { key: 'ph:syringe-duotone', label: 'Syringe' },
  { key: 'ph:pill-duotone', label: 'Pill' },
  { key: 'ph:first-aid-kit-duotone', label: 'First Aid Kit' },
  { key: 'ph:bandaids-duotone', label: 'Bandaids' },
  { key: 'ph:thermometer-duotone', label: 'Thermometer' },
  { key: 'ph:tooth-duotone', label: 'Tooth' },
  { key: 'ph:eye-duotone', label: 'Eye' },
  { key: 'ph:ear-duotone', label: 'Ear' },
  { key: 'ph:hand-heart-duotone', label: 'Care' },
  { key: 'ph:baby-duotone', label: 'Baby' },
  { key: 'ph:wheelchair-duotone', label: 'Wheelchair' },
  { key: 'ph:dna-duotone', label: 'DNA / Genetics' },
  { key: 'ph:flask-duotone', label: 'Laboratory' },
  { key: 'ph:microscope-duotone', label: 'Microscope' },
  { key: 'ph:ambulance-duotone', label: 'Ambulance' },
  { key: 'ph:hospital-duotone', label: 'Hospital' },
  { key: 'ph:house-simple-duotone', label: 'Home Visit' },
  { key: 'ph:video-camera-duotone', label: 'Telemedicine' },
  { key: 'ph:barbell-duotone', label: 'Physiotherapy' },
  { key: 'ph:leaf-duotone', label: 'Nutrition / Diet' },
  { key: 'ph:sparkle-duotone', label: 'Wellness' },
  { key: 'ph:moon-stars-duotone', label: 'Sleep / Rest' },
  { key: 'ph:cloud-duotone', label: 'Respiratory' },
  { key: 'ph:person-arms-spread-duotone', label: 'Rehabilitation' },
  { key: 'ph:shield-plus-duotone', label: 'Prevention' },
  { key: 'ph:clock-countdown-duotone', label: 'Urgent Care' },
]

const TABLER: { key: string; label: string }[] = [
  { key: 'tabler:stethoscope', label: 'Stethoscope' },
  { key: 'tabler:heart-rate-monitor', label: 'Heart Rate Monitor' },
  { key: 'tabler:brain', label: 'Brain' },
  { key: 'tabler:tooth', label: 'Tooth / Dental' },
  { key: 'tabler:eye', label: 'Eye' },
  { key: 'tabler:pill', label: 'Pill' },
  { key: 'tabler:vaccine', label: 'Vaccine' },
  { key: 'tabler:test-pipe', label: 'Lab Test' },
  { key: 'tabler:microscope', label: 'Microscope' },
  { key: 'tabler:ambulance', label: 'Ambulance' },
  { key: 'tabler:first-aid-kit', label: 'First Aid Kit' },
  { key: 'tabler:bandage', label: 'Bandage' },
  { key: 'tabler:thermometer', label: 'Thermometer' },
  { key: 'tabler:lungs', label: 'Lungs' },
  { key: 'tabler:bone', label: 'Bone / Ortho' },
  { key: 'tabler:dna', label: 'DNA' },
  { key: 'tabler:radiation', label: 'Radiology' },
  { key: 'tabler:wheelchair', label: 'Disability / Mobility' },
  { key: 'tabler:baby-carriage', label: 'Paediatrics' },
  { key: 'tabler:old', label: 'Geriatrics' },
  { key: 'tabler:heartbeat', label: 'Cardiology' },
  { key: 'tabler:medical-cross', label: 'General Medical' },
  { key: 'tabler:needle', label: 'Injection' },
  { key: 'tabler:report-medical', label: 'Medical Report' },
  { key: 'tabler:prescription', label: 'Prescription' },
  { key: 'tabler:barbell', label: 'Physiotherapy' },
  { key: 'tabler:salad', label: 'Nutrition' },
  { key: 'tabler:home-heart', label: 'Home Care' },
  { key: 'tabler:device-tv-old', label: 'Telemedicine' },
  { key: 'tabler:urgent', label: 'Emergency / Urgent' },
]

const EMOJIS: { key: string; label: string }[] = [
  { key: '🩺', label: 'Stethoscope' },
  { key: '🫀', label: 'Anatomical Heart' },
  { key: '🫁', label: 'Lungs' },
  { key: '🧠', label: 'Brain' },
  { key: '🦷', label: 'Tooth' },
  { key: '👁️', label: 'Eye' },
  { key: '🦴', label: 'Bone' },
  { key: '👂', label: 'Ear' },
  { key: '💊', label: 'Pill' },
  { key: '💉', label: 'Syringe' },
  { key: '🩸', label: 'Blood' },
  { key: '🔬', label: 'Microscope' },
  { key: '🩻', label: 'X-Ray' },
  { key: '🩹', label: 'Bandage' },
  { key: '🚑', label: 'Ambulance' },
  { key: '🏥', label: 'Hospital' },
  { key: '🏠', label: 'Home Visit' },
  { key: '📱', label: 'Telemedicine' },
  { key: '🤰', label: 'Pregnancy' },
  { key: '👶', label: 'Baby' },
  { key: '🧸', label: 'Childcare' },
  { key: '🧓', label: 'Elderly' },
  { key: '🧘', label: 'Mental Health' },
  { key: '💪', label: 'Physiotherapy' },
  { key: '🥗', label: 'Nutrition' },
  { key: '🧬', label: 'Genetics' },
  { key: '🎗️', label: 'Oncology' },
  { key: '❤️', label: 'Heart Health' },
  { key: '⚕️', label: 'Medical Symbol' },
  { key: '🌡️', label: 'Thermometer' },
]

type TabId = 'healthicons' | 'phosphor' | 'tabler' | 'emoji'

const TABS: { id: TabId; label: string }[] = [
  { id: 'healthicons', label: 'Healthicons' },
  { id: 'phosphor', label: 'Phosphor' },
  { id: 'tabler', label: 'Tabler' },
  { id: 'emoji', label: 'Emoji' },
]

function getLibraryItems(tab: TabId) {
  switch (tab) {
    case 'healthicons': return HEALTHICONS
    case 'phosphor': return PHOSPHOR
    case 'tabler': return TABLER
    case 'emoji': return EMOJIS
  }
}

interface IconPickerProps {
  value?: string | null
  onChange: (iconKey: string, isEmoji: boolean) => void
  onClose?: () => void
  color?: string
}

export default function IconPicker({ value, onChange, onClose, color = '#0C6780' }: IconPickerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('healthicons')
  const [search, setSearch] = useState('')

  const items = useMemo(() => {
    const all = getLibraryItems(activeTab)
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all.filter(i => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q))
  }, [activeTab, search])

  const handleSelect = (item: { key: string; label: string }) => {
    onChange(item.key, activeTab === 'emoji')
    onClose?.()
  }

  const renderItem = (item: { key: string; label: string }) => {
    const isSelected = value === item.key
    return (
      <button
        key={item.key}
        type="button"
        title={item.label}
        onClick={() => handleSelect(item)}
        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all text-center
          ${isSelected
            ? 'border-[#0C6780] bg-[#0C6780]/10 ring-2 ring-[#0C6780]/30'
            : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
      >
        {activeTab === 'emoji' ? (
          <span className="text-2xl leading-none select-none">{item.key}</span>
        ) : (
          <Icon icon={item.key} width={28} height={28} color={isSelected ? color : '#374151'} />
        )}
        <span className="text-[9px] text-gray-500 leading-tight line-clamp-2 w-full">{item.label}</span>
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-[340px] sm:w-[400px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">Choose Icon</span>
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <FaTimes className="text-xs" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search icons..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C6780]/30 focus:border-[#0C6780] bg-gray-50"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setSearch('') }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all
              ${activeTab === tab.id
                ? 'bg-[#0C6780] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="p-3 grid grid-cols-5 gap-1.5 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300">
        {items.length === 0 ? (
          <div className="col-span-5 text-center py-8 text-xs text-gray-400">No icons found</div>
        ) : (
          items.map(renderItem)
        )}
      </div>

      {/* Selected preview */}
      {value && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-500">Selected:</span>
          {value.length <= 4 ? (
            <span className="text-lg">{value}</span>
          ) : (
            <Icon icon={value} width={20} height={20} color={color} />
          )}
          <span className="text-xs font-mono text-gray-600 truncate flex-1">{value}</span>
          <button
            type="button"
            onClick={() => onChange('', false)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
