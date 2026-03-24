import Link from 'next/link'
import {
 FaUsers,
 FaShieldAlt,
 FaClock,
 FaCheckCircle,
 FaFileAlt,
 FaTimes,
 FaDollarSign,
 FaChartLine
} from 'react-icons/fa'
import { CorporateStats, Employee, ClaimsData } from '../types'
import StatCard from './StatCard'

interface DashboardOverviewProps {
 stats: CorporateStats
 recentEmployees: Employee[]
 recentClaims: ClaimsData[]
}

export default function DashboardOverview({
 stats,
 recentEmployees,
 recentClaims
}: DashboardOverviewProps) {

 const getStatusInfo = (status: string) => {
 switch (status) {
 case 'approved': return { text: 'Approved', color: 'bg-green-100 text-green-800', icon: FaCheckCircle };
 case 'pending': return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: FaClock };
 case 'rejected': return { text: 'Rejected', color: 'bg-red-100 text-red-800', icon: FaTimes };
 case 'active': return { text: 'Active', color: 'bg-green-100 text-green-800', icon: FaCheckCircle };
 case 'inactive': return { text: 'Inactive', color: 'bg-gray-100 text-gray-800', icon: FaTimes };
 default: return { text: status, color: 'bg-gray-100 text-gray-800', icon: FaClock };
 }
 };

 return (
 <>
 {/* Quick Stats */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <StatCard
 icon={FaUsers}
 title="Total Employees"
 value={stats.totalEmployees}
 color="bg-blue-500"
 subtitle={`${stats.activePolicyHolders} with active policies`}
 />
 <StatCard
 icon={FaShieldAlt}
 title="Policy Holders"
 value={stats.activePolicyHolders}
 color="bg-green-500"
 subtitle={`${stats.pendingVerifications} pending verification`}
 />
 <StatCard
 icon={FaFileAlt}
 title="Total Claims"
 value={stats.totalClaims}
 color="bg-purple-500"
 subtitle={`${stats.pendingClaims} pending review`}
 />
 <StatCard
 icon={FaDollarSign}
 title="Monthly Premium"
 value={`Rs ${stats.monthlyContribution.toLocaleString()}`}
 color="bg-orange-500"
 subtitle="Current billing cycle"
 />
 </div>

 <div className="grid lg:grid-cols-3 gap-8">
 {/* Main Content */}
 <div className="lg:col-span-2 space-y-8">
 {/* Recent Employees */}
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Recent Employee Additions</h2>
 <Link href="/corporate/employees" className="text-blue-600 hover:underline font-medium">
 Manage All Employees
 </Link>
 </div>
 {recentEmployees.length === 0 ? (
 <p className="text-gray-500 text-center py-8">No employees added yet</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead className="bg-gray-50">
 <tr>
 <th className="p-3 font-medium text-gray-600">Employee</th>
 <th className="p-3 font-medium text-gray-600">Department</th>
 <th className="p-3 font-medium text-gray-600">Policy Type</th>
 <th className="p-3 font-medium text-gray-600">Status</th>
 <th className="p-3 font-medium text-gray-600">Join Date</th>
 </tr>
 </thead>
 <tbody>
 {recentEmployees.map((employee) => {
 const statusInfo = getStatusInfo(employee.status);
 return (
 <tr key={employee.id} className="border-b hover:bg-gray-50">
 <td className="p-3">
 <div>
 <p className="font-medium text-gray-900">{employee.name}</p>
 <p className="text-gray-500 text-xs">{employee.email}</p>
 </div>
 </td>
 <td className="p-3 text-gray-600">{employee.department}</td>
 <td className="p-3 text-gray-600">{employee.policyType}</td>
 <td className="p-3">
 <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${statusInfo.color}`}>
 <statusInfo.icon className="text-xs" /> {statusInfo.text}
 </span>
 </td>
 <td className="p-3 text-gray-600 text-xs">{employee.joinDate}</td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Claims Overview */}
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Recent Claims Activity</h2>
 <Link href="/corporate/claims" className="text-blue-600 hover:underline font-medium">
 View All Claims
 </Link>
 </div>
 {recentClaims.length === 0 ? (
 <p className="text-gray-500 text-center py-8">No claims submitted yet</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead className="bg-gray-50">
 <tr>
 <th className="p-3 font-medium text-gray-600">Employee</th>
 <th className="p-3 font-medium text-gray-600">Claim Type</th>
 <th className="p-3 font-medium text-gray-600">Amount</th>
 <th className="p-3 font-medium text-gray-600">Status</th>
 <th className="p-3 font-medium text-gray-600">Date</th>
 </tr>
 </thead>
 <tbody>
 {recentClaims.map((claim) => {
 const statusInfo = getStatusInfo(claim.status);
 return (
 <tr key={claim.id} className="border-b hover:bg-gray-50">
 <td className="p-3 font-medium text-gray-900">{claim.employeeName}</td>
 <td className="p-3 text-gray-600">{claim.claimType}</td>
 <td className="p-3 font-medium text-gray-900">Rs {claim.amount.toLocaleString()}</td>
 <td className="p-3">
 <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${statusInfo.color}`}>
 <statusInfo.icon className="text-xs" /> {statusInfo.text}
 </span>
 </td>
 <td className="p-3 text-gray-600 text-xs">{claim.date}</td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>

 {/* Sidebar */}
 <div className="space-y-8">
 {/* Claims Summary */}
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <h3 className="text-lg font-bold text-gray-900 mb-4">Claims Summary</h3>
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-gray-600">Approved Claims</span>
 <span className="font-bold text-green-600">{stats.approvedClaims}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-gray-600">Pending Claims</span>
 <span className="font-bold text-yellow-600">{stats.pendingClaims}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-gray-600">Rejected Claims</span>
 <span className="font-bold text-red-600">{stats.rejectedClaims}</span>
 </div>
 <div className="border-t pt-3 mt-3 flex justify-between items-center">
 <span className="font-bold text-gray-900">Total Claims</span>
 <span className="font-bold text-xl text-blue-600">{stats.totalClaims}</span>
 </div>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="bg-brand-navy text-white rounded-2xl p-6">
 <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
 <div className="space-y-3">
 <Link
 href="/corporate/employees"
 className="block bg-white/20 hover:bg-white/30 rounded-lg p-3 transition-colors"
 >
 <div className="flex items-center gap-2">
 <FaUsers className="text-lg" />
 <span className="font-medium">Manage Employees</span>
 </div>
 </Link>
 <Link
 href="/corporate/billing"
 className="block bg-white/20 hover:bg-white/30 rounded-lg p-3 transition-colors"
 >
 <div className="flex items-center gap-2">
 <FaDollarSign className="text-lg" />
 <span className="font-medium">View Billing</span>
 </div>
 </Link>
 <Link
 href="/corporate/billing"
 className="block bg-white/20 hover:bg-white/30 rounded-lg p-3 transition-colors"
 >
 <div className="flex items-center gap-2">
 <FaChartLine className="text-lg" />
 <span className="font-medium">Usage Analytics</span>
 </div>
 </Link>
 </div>
 </div>
 </div>
 </div>
 </>
 )
}
