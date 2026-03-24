import { FaExclamationTriangle } from 'react-icons/fa'

const MedicalDisclaimer: React.FC = () => {
 return (
 <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
 <div className="flex items-start gap-3">
 <FaExclamationTriangle className="text-red-500 text-xl flex-shrink-0 mt-1" />
 <div>
 <h4 className="font-semibold text-red-800 mb-2">Important Medical Disclaimer</h4>
 <p className="text-red-700 text-sm leading-relaxed mb-3">
 All medicine purchases must be made with a valid doctor&apos;s prescription. This platform provides 
 general health information for educational purposes only. Always consult qualified healthcare 
 professionals for proper diagnosis, treatment, and medical advice.
 </p>
 <p className="text-red-600 text-xs">
 By purchasing medicines through this platform, you acknowledge that you have a valid prescription 
 and understand the risks associated with self-medication.
 </p>
 </div>
 </div>
 </div>
 )
}

export default MedicalDisclaimer