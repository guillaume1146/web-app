'use client'

import { FaGlassWater } from 'react-icons/fa6'

export interface WaterTrackerProps {
 consumed: number
 target: number
 onAddGlass: () => void
 onRemoveGlass?: () => void
 glassSize?: number
}

export default function WaterTracker({
 consumed,
 target,
 onAddGlass,
 onRemoveGlass,
 glassSize = 250,
}: WaterTrackerProps) {
 const totalGlasses = Math.ceil(target / glassSize)
 const displayGlasses = Math.min(totalGlasses, 8)
 const filledGlasses = Math.floor(consumed / glassSize)
 const progressPercent = target > 0 ? Math.min((consumed / target) * 100, 100) : 0

 return (
 <div className="bg-white rounded-lg shadow-sm p-4">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold text-gray-700">Water Intake</h3>
 {onRemoveGlass && filledGlasses > 0 && (
 <button
 onClick={onRemoveGlass}
 className="text-xs text-gray-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
 aria-label="Remove last glass"
 >
 Undo
 </button>
 )}
 </div>

 {/* Glass icons */}
 <div className="flex flex-wrap gap-2 mb-3">
 {Array.from({ length: displayGlasses }).map((_, i) => {
 const isFilled = i < filledGlasses
 return (
 <button
 key={i}
 onClick={!isFilled ? onAddGlass : undefined}
 disabled={isFilled}
 className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
 isFilled
 ? 'bg-blue-100 text-blue-500 cursor-default'
 : 'bg-gray-50 text-gray-300 hover:bg-blue-50 hover:text-blue-400 cursor-pointer'
 }`}
 aria-label={isFilled ? `Glass ${i + 1} filled` : `Add glass ${i + 1}`}
 >
 <FaGlassWater className="text-lg" />
 </button>
 )
 })}
 </div>

 {/* Text display */}
 <p className="text-sm text-gray-600 mb-2">
 <span className="font-semibold text-blue-600">{consumed}ml</span>
 <span className="text-gray-400"> / {target}ml</span>
 </p>

 {/* Progress bar */}
 <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
 style={{ width: `${progressPercent}%` }}
 />
 </div>
 </div>
 )
}
