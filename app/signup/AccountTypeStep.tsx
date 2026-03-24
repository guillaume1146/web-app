import { FaInfoCircle } from 'react-icons/fa'
import { userTypes, documentRequirements } from './constants'

interface AccountTypeStepProps {
 selectedUserType: string;
 onUserTypeChange: (userTypeId: string) => void;
}

export default function AccountTypeStep({ selectedUserType, onUserTypeChange }: AccountTypeStepProps) {
 const selectedType = userTypes.find(type => type.id === selectedUserType)

 return (
 <div>
 <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Account Type</h2>
 <p className="text-gray-600 mb-8">Choose the type of account that best describes your role in healthcare</p>
 
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
 : "border-gray-200 hover:border-gray-300"
 }`}
 >
 <Icon className={`text-3xl mb-4 ${
 selectedUserType === type.id ? "" : "text-gray-400"
 }`} />
 <h3 className="font-bold text-lg mb-2">{type.label}</h3>
 <p className="text-sm text-gray-600">{type.description}</p>
 </button>
 )
 })}
 </div>

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