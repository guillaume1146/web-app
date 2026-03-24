'use client'

import { IconType } from 'react-icons'
import { FaPlus } from 'react-icons/fa'

interface ProviderPageHeaderProps {
 icon: IconType
 title: string
 subtitle: string
 gradient: string // e.g. " "
 onBook: () => void
 bookLabel?: string // e.g. "Book Appointment", "Book Service"
}

export default function ProviderPageHeader({
 icon: Icon,
 title,
 subtitle,
 gradient,
 onBook,
 bookLabel = 'Book Now',
}: ProviderPageHeaderProps) {
 return (
 <div className={` ${gradient} rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-white`}>
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 flex items-center">
 <Icon className="mr-2 sm:mr-3" />
 {title}
 </h2>
 <p className="opacity-90 text-xs sm:text-sm">{subtitle}</p>
 </div>
 <button
 onClick={onBook}
 className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition flex items-center gap-2 text-sm w-fit"
 >
 <FaPlus />
 {bookLabel}
 </button>
 </div>
 </div>
 )
}
