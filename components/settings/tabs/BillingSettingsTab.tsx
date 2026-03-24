'use client'

import { FaCreditCard } from 'react-icons/fa'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'
import PaymentMethodForm from '@/components/shared/PaymentMethodForm'

interface BillingSettingsTabProps {
 userId: string | null
}

const BillingSettingsTab: React.FC<BillingSettingsTabProps> = ({ userId }) => {
 if (!userId) {
 return (
 <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
 Loading billing information...
 </div>
 )
 }

 return (
 <div className="space-y-8">
 <div>
 <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
 <FaCreditCard className="text-blue-600" /> Wallet & Balance
 </h2>
 <WalletBalanceCard userId={userId} />
 </div>

 <div className="border-t pt-6">
 <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
 <FaCreditCard className="text-blue-600" /> Payment Methods
 </h2>
 <div className="bg-white rounded-xl border border-gray-100 p-6">
 <PaymentMethodForm />
 </div>
 </div>
 </div>
 )
}

export default BillingSettingsTab
