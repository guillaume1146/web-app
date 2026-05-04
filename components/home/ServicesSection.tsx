'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FaSearch, FaConciergeBell, FaClock, FaArrowRight } from 'react-icons/fa'
import { Icon } from '@iconify/react'
import HorizontalScrollRow from '@/components/shared/HorizontalScrollRow'

interface ServiceItem {
  id: string
  serviceName: string
  category: string
  description: string | null
  providerType: string
  defaultPrice: number
  currency: string
  duration: number | null
  providerCount: number
  iconKey?: string | null
  emoji?: string | null
}

interface RoleData {
  code: string
  label: string
  slug: string
  color: string
}

function hex2rgba(hex: string, alpha = 0.12) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Each service maps to a unique healthcare-specific healthicons iconify key.
// Ordered from most specific to most generic — no two services in the same
// provider group should collide if their names are reasonably descriptive.
function resolveServiceIconKey(name: string, category: string, providerType: string): string {
  const t = `${name} ${category}`.toLowerCase()

  // Anatomy-specific (highest specificity)
  if (/cardio|heart disease|arrhythm|chest pain/.test(t))       return 'healthicons:heart-organ'
  if (/pulmon|lung|bronch|respir|chest infect/.test(t))          return 'healthicons:lungs'
  if (/neuro|brain|stroke|epilep|cereb|headache/.test(t))        return 'healthicons:brain-alt-outline'
  if (/dental|teeth|tooth|oral|gum|cavity|braces/.test(t))       return 'healthicons:dentistry-outline'
  if (/eye|vision|ophth|retina|glaucom|cataract/.test(t))        return 'healthicons:eye-health-outline'
  if (/bone|ortho|joint|spine|fracture|arthrit|knee|hip/.test(t)) return 'healthicons:orthopedic-hand-outline'
  if (/ear|hearing|ent|audiol|tinnit/.test(t))                   return 'healthicons:ear'
  if (/kidney|renal|urol|bladder|prostate/.test(t))              return 'healthicons:kidney'
  if (/liver|hepat|gallblad|jaundic/.test(t))                    return 'healthicons:liver'
  if (/gastro|stomach|digest|bowel|colon|intestin|acid/.test(t)) return 'healthicons:gastro-entero'
  if (/skin|derma|acne|rash|eczema|psoriasis/.test(t))           return 'healthicons:skin-alt'

  // Procedures & tests
  if (/x.?ray|mri|ct scan|ultrasound|radiol|imaging/.test(t))   return 'healthicons:x-ray'
  if (/blood test|hematol|anemia|coagul/.test(t))                return 'healthicons:blood'
  if (/lab|sample|culture|swab|biopsy|pathol|urine/.test(t))     return 'healthicons:laboratory'
  if (/vaccine|immuniz|vaccin/.test(t))                           return 'healthicons:vaccination'
  if (/wound|dressing|bandage|suture|stitch/.test(t))            return 'healthicons:wound-and-injury-care'
  if (/surgery|operat|procedure|incision/.test(t))                return 'healthicons:surgery'
  if (/cancer|oncol|tumor|chemo|radiother/.test(t))              return 'healthicons:cancer'
  if (/injection|iv therapy|infus|intravenous/.test(t))          return 'healthicons:syringe'
  if (/hiv|aids|sti|std|infectious|communicable/.test(t))        return 'healthicons:hiv'

  // Services & modes
  if (/home visit|house call|domicil|home care/.test(t))         return 'healthicons:home-health'
  if (/video|telehealth|telemedicine|online|virtual|remote/.test(t)) return 'healthicons:telemedicine'
  if (/emergency|ambulance|urgent|trauma|rescue/.test(t))        return 'healthicons:emergency-referral'
  if (/pharmacy|prescription|dispensing/.test(t))                 return 'healthicons:pharmacy'
  if (/physio|rehabilit|movement|mobility|stretching/.test(t))   return 'healthicons:physiotherapy'
  if (/mental|psych|anxiety|depress|counsel|talk therapy/.test(t)) return 'healthicons:mental-health'
  if (/nutrition|diet|food|meal plan|weight loss/.test(t))       return 'healthicons:nutrition-care'
  if (/elder|geriat|elderly|senior care|aged/.test(t))           return 'healthicons:old-people-outline'
  if (/pregnan|obstetric|maternal|antenatal|prenatal|birth/.test(t)) return 'healthicons:pregnant-woman'
  if (/baby|infant|newborn|neonat|pediatr/.test(t))              return 'healthicons:infant'
  if (/nanny|childcare|babysit|child/.test(t))                   return 'healthicons:child-programme'
  if (/diabetes|glucose|insulin|endocrin|thyroid|hormone/.test(t)) return 'healthicons:glucose'
  if (/blood pressure|hypertens|cardiovas|heart fail/.test(t))   return 'healthicons:blood-pressure'
  if (/oxygen|asthma|inhaler|copd/.test(t))                      return 'healthicons:lungs'
  if (/general consult|check.?up|annual|screening|assessment/.test(t)) return 'healthicons:stethoscope'
  if (/prescription|medication|drug|medicine/.test(t))           return 'healthicons:medicines'
  if (/caregiver|care plan|chronic|management|monitoring/.test(t)) return 'healthicons:community-health-worker'
  if (/specialist|referral|second opinion/.test(t))              return 'healthicons:doctor'

  // Provider-type fallbacks — each role gets a distinct icon
  const FALLBACK: Record<string, string> = {
    DOCTOR:           'healthicons:doctor',
    NURSE:            'healthicons:nurse',
    NANNY:            'healthicons:child-programme',
    PHARMACIST:       'healthicons:pharmacy',
    LAB_TECHNICIAN:   'healthicons:laboratory',
    EMERGENCY_WORKER: 'healthicons:ambulance',
    CAREGIVER:        'healthicons:community-health-worker',
    PHYSIOTHERAPIST:  'healthicons:physiotherapy',
    DENTIST:          'healthicons:dentistry',
    OPTOMETRIST:      'healthicons:eye-health',
    NUTRITIONIST:     'healthicons:nutrition-care',
  }
  return FALLBACK[providerType] ?? 'healthicons:stethoscope'
}

const PROVIDER_ICON: Record<string, string> = {
  DOCTOR:           'healthicons:doctor',
  NURSE:            'healthicons:nurse',
  NANNY:            'healthicons:child-programme',
  PHARMACIST:       'healthicons:pharmacy',
  LAB_TECHNICIAN:   'healthicons:laboratory',
  EMERGENCY_WORKER: 'healthicons:ambulance',
  CAREGIVER:        'healthicons:community-health-worker',
  PHYSIOTHERAPIST:  'healthicons:physiotherapy',
  DENTIST:          'healthicons:dentistry',
  OPTOMETRIST:      'healthicons:eye-health',
  NUTRITIONIST:     'healthicons:nutrition-care',
}

export default function ServicesSection() {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [roles, setRoles] = useState<RoleData[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeRole, setActiveRole] = useState<string>('ALL')

  useEffect(() => {
    Promise.all([
      fetch('/api/search/services?limit=200').then(r => r.json()),
      fetch('/api/roles?searchEnabled=true').then(r => r.json()),
    ]).then(([svcJson, rolesJson]) => {
      if (svcJson.success && Array.isArray(svcJson.data)) setServices(svcJson.data)
      if (rolesJson.success && Array.isArray(rolesJson.data)) setRoles(rolesJson.data)
    }).catch(() => setFetchError(true)).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = services
    if (activeRole !== 'ALL') list = list.filter(s => s.providerType === activeRole)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s =>
        s.serviceName.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [services, activeRole, searchQuery])

  const groupedByRole = useMemo(() => {
    const map: Record<string, ServiceItem[]> = {}
    for (const svc of filtered) {
      if (!map[svc.providerType]) map[svc.providerType] = []
      map[svc.providerType].push(svc)
    }
    return map
  }, [filtered])

  // DOCTOR group always first, then order by roles API sequence
  const orderedRoleCodes = useMemo(() => {
    const keys = Object.keys(groupedByRole)
    return keys.sort((a, b) => {
      if (a === 'DOCTOR') return -1
      if (b === 'DOCTOR') return 1
      const ia = roles.findIndex(r => r.code === a)
      const ib = roles.findIndex(r => r.code === b)
      return ia - ib
    })
  }, [groupedByRole, roles])

  const roleInfo = useMemo(() => {
    const info: Record<string, RoleData> = {}
    for (const r of roles) info[r.code] = r
    return info
  }, [roles])

  return (
    <section className="py-8 sm:py-12 bg-white overflow-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14">

        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-10 xl:-mx-14 px-4 sm:px-6 lg:px-10 xl:px-14
          pt-4 sm:pt-6 pb-3 sm:pb-4 mb-4 sm:mb-6 bg-white/95 backdrop-blur-sm border-b border-gray-100">

          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FaConciergeBell className="text-[#0C6780] text-xl" />
                Find Services
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Browse what every provider type offers</p>
            </div>
            <Link
              href="/search/services"
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-[#0C6780] hover:text-[#001E40] transition-colors whitespace-nowrap mt-1"
            >
              See All <FaArrowRight className="text-xs" />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-shrink-0 sm:w-64">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C6780]/30 focus:border-[#0C6780] bg-gray-50"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setActiveRole('ALL')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                  ${activeRole === 'ALL'
                    ? 'bg-[#0C6780] text-white border-[#0C6780]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#0C6780] hover:text-[#0C6780]'}`}
              >
                All
              </button>
              {roles.map(role => (
                <button
                  key={role.code}
                  onClick={() => setActiveRole(role.code)}
                  style={activeRole === role.code ? { backgroundColor: role.color, borderColor: role.color } : {}}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                    ${activeRole === role.code
                      ? 'text-white'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'}`}
                >
                  {PROVIDER_ICON[role.code] && (
                    <Icon
                      icon={PROVIDER_ICON[role.code]}
                      width={13}
                      height={13}
                      color={activeRole === role.code ? '#ffffff' : role.color}
                    />
                  )}
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="flex-shrink-0 w-[160px] sm:w-52 h-52 bg-gray-100 rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : fetchError || Object.keys(groupedByRole).length === 0 ? (
          <div className="text-center py-16">
            <FaConciergeBell className="text-4xl text-gray-300 mx-auto mb-3" />
            {fetchError ? (
              <p className="text-sm font-medium text-gray-600">Could not load services — check that the backend is running.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600">No services match your search.</p>
                <button onClick={() => { setSearchQuery(''); setActiveRole('ALL') }} className="mt-2 text-xs text-[#0C6780] hover:underline">
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          orderedRoleCodes.map(roleCode => {
            const roleServices = groupedByRole[roleCode]
            const info = roleInfo[roleCode]
            const color = info?.color ?? '#0C6780'
            const slug = info?.slug ?? roleCode.toLowerCase()
            const label = info?.label ?? roleCode

            return (
              <HorizontalScrollRow
                key={roleCode}
                title={`From ${label}`}
                subtitle={`${roleServices.length} service${roleServices.length !== 1 ? 's' : ''}`}
                icon={
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}18` }}>
                    <Icon icon={PROVIDER_ICON[roleCode] ?? 'healthicons:stethoscope'} width={18} height={18} color={color} />
                  </div>
                }
                seeAllHref={`/search/${slug}`}
                seeAllLabel="Browse providers"
              >
                {roleServices.map(svc => (
                  <ServiceCard key={svc.id} service={svc} color={color} slug={slug} />
                ))}
              </HorizontalScrollRow>
            )
          })
        )}

        <div className="text-center mt-4 sm:hidden">
          <Link
            href="/search/services"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0C6780] text-white rounded-xl text-sm font-medium"
          >
            See All Services <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function ServiceCard({ service, color, slug }: { service: ServiceItem; color: string; slug: string }) {
  const iconKey = service.iconKey ?? resolveServiceIconKey(service.serviceName, service.category, service.providerType)
  const bgLight  = hex2rgba(color, 0.10)
  const bgMedium = hex2rgba(color, 0.20)

  return (
    <Link
      href={`/search/${slug}`}
      className="group flex-shrink-0 snap-start w-[160px] sm:w-52 flex flex-col bg-white rounded-2xl border border-gray-100
        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Illustration header — always uses healthicons icon */}
      <div
        className="relative w-full h-28 sm:h-32 flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${bgMedium} 0%, ${bgLight} 100%)` }}
      >
        <span className="group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
          <Icon icon={iconKey} width={72} height={72} color={color} />
        </span>
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
      </div>

      {/* Text */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <h4 className="text-sm font-bold leading-snug line-clamp-2 mb-1" style={{ color }}>
          {service.serviceName}
        </h4>
        {service.description && (
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
            {service.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 sm:px-4 pb-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-gray-900">
          Rs {service.defaultPrice.toLocaleString()}
        </span>
        {service.duration && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <FaClock className="text-[9px]" /> {service.duration}m
          </span>
        )}
      </div>
    </Link>
  )
}
