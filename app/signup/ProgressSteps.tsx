import { FaCheck } from 'react-icons/fa'
import { steps } from './constants'

interface ProgressStepsProps {
  currentStep: number;
}

export default function ProgressSteps({ currentStep }: ProgressStepsProps) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-6 shadow-lg mb-4 sm:mb-8">
      <div className="flex items-center justify-between w-full">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-base ${
                currentStep > step.number ? "bg-green-500 text-white" :
                currentStep === step.number ? "bg-blue-600 text-white" :
                "bg-gray-200 text-gray-600"
              }`}>
                {currentStep > step.number ? <FaCheck className="text-[10px] sm:text-sm" /> : <step.icon className="text-[10px] sm:text-sm" />}
              </div>
              <span className={`text-[8px] sm:text-sm mt-0.5 sm:mt-2 font-medium text-center leading-tight max-w-[50px] sm:max-w-none ${
                currentStep >= step.number ? "text-blue-600" : "text-gray-500"
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 sm:h-1 mx-0.5 sm:mx-4 min-w-[12px] ${
                currentStep > step.number ? "bg-green-500" : "bg-gray-200"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
