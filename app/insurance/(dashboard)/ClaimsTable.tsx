import { FaCheck, FaTimes, FaEye, FaClock, FaSpinner } from 'react-icons/fa'
import { InsuranceClaim } from './types'
import { claimStatuses } from './constants'

interface ClaimsTableProps {
 claims: InsuranceClaim[]
 onUpdateClaim?: (claimId: string, status: string) => void
}

export default function ClaimsTable({ claims, onUpdateClaim }: ClaimsTableProps) {
 const getStatusInfo = (status: string) => {
 const statusConfig = claimStatuses.find(s => s.value === status)
 return statusConfig || { label: status, color: 'bg-gray-100 text-gray-800' }
 }

 const getStatusIcon = (status: string) => {
 switch (status) {
 case 'pending': return FaClock
 case 'processing': return FaSpinner
 case 'approved': return FaCheck
 case 'rejected': return FaTimes
 default: return FaEye
 }
 }

 return (
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Recent Claims</h2>
 <button className="text-blue-600 hover:underline font-medium">View All</button>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead className="bg-gray-50">
 <tr>
 <th className="p-3 font-medium text-gray-600">Claim ID</th>
 <th className="p-3 font-medium text-gray-600">Policy Holder</th>
 <th className="p-3 font-medium text-gray-600">Policy Type</th>
 <th className="p-3 font-medium text-gray-600">Amount</th>
 <th className="p-3 font-medium text-gray-600">Status</th>
 <th className="p-3 font-medium text-gray-600">Date</th>
 <th className="p-3 font-medium text-gray-600">Actions</th>
 </tr>
 </thead>
 <tbody>
 {claims.map((claim) => {
 const statusInfo = getStatusInfo(claim.status)
 const StatusIcon = getStatusIcon(claim.status)
 
 return (
 <tr key={claim.id} className="border-b hover:bg-gray-50">
 <td className="p-3 font-mono text-xs">{claim.claimId}</td>
 <td className="p-3 font-medium">{claim.policyHolderName}</td>
 <td className="p-3 text-gray-600">{claim.policyType}</td>
 <td className="p-3 font-semibold">Rs {claim.claimAmount.toLocaleString()}</td>
 <td className="p-3">
 <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${statusInfo.color}`}>
 <StatusIcon className={claim.status === 'processing' ? 'animate-spin' : ''} />
 {statusInfo.label}
 </span>
 </td>
 <td className="p-3 text-gray-500">{claim.submittedDate}</td>
 <td className="p-3">
 <div className="flex items-center gap-2">
 <button className="bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors">
 <FaEye className="inline mr-1" />
 View
 </button>
 {claim.status === 'pending' && onUpdateClaim && (
 <>
 <button 
 onClick={() => onUpdateClaim(claim.id, 'approved')}
 className="bg-green-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-600 transition-colors"
 >
 <FaCheck className="inline mr-1" />
 Approve
 </button>
 <button 
 onClick={() => onUpdateClaim(claim.id, 'rejected')}
 className="bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-red-600 transition-colors"
 >
 <FaTimes className="inline mr-1" />
 Reject
 </button>
 </>
 )}
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </div>
 )
}