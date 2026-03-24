'use client'

import { useState, FormEvent, ChangeEvent, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { userTypes, documentRequirements } from './constants'
import { SignupFormData, Document } from './types'
import ProgressSteps from './ProgressSteps'
import AccountTypeStep from './AccountTypeStep'
import BasicInfoStep from './BasicInfoStep'
import DocumentUploadStep from './DocumentUploadStep'
import SubscriptionStep from './SubscriptionStep'
import VerificationStep from './VerificationStep'
import NavigationButtons from './NavigationButtons'
import LegalModals from './LegalModals'
import { useDocumentVerification } from './hooks/useDocumentVerification'
import { captureReferralParams, getTrackingId, setTrackingId, clearReferralTracking } from '@/lib/referral-tracking'

export default function RegistrationForm() {
 const [currentStep, setCurrentStep] = useState(1)
 const [selectedUserType, setSelectedUserType] = useState<string>('patient')
 const [showPassword, setShowPassword] = useState(false)
 const [showConfirmPassword, setShowConfirmPassword] = useState(false)
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [submissionSuccess, setSubmissionSuccess] = useState(false)
 const [submissionError, setSubmissionError] = useState<string | null>(null)
 const [documents, setDocuments] = useState<Document[]>(documentRequirements.patient)

 // Modal states
 const [disclaimerOpen, setDisclaimerOpen] = useState(false)
 const [termsOpen, setTermsOpen] = useState(false)
 const [privacyOpen, setPrivacyOpen] = useState(false)

 const router = useRouter()
 const searchParams = useSearchParams()

 const [formData, setFormData] = useState<SignupFormData>({
 fullName: '',
 email: '',
 password: '',
 confirmPassword: '',
 phone: '',
 dateOfBirth: '',
 gender: '',
 address: '',
 userType: 'patient',
 regionId: '',
 profileImageUrl: '',
 referralCode: searchParams.get('promo') || '',
 emergencyContactName: '',
 emergencyContactPhone: '',
 emergencyContactRelation: '',
 agreeToTerms: false,
 agreeToPrivacy: false,
 agreeToDisclaimer: false
 })

 // Document OCR verification
 const { verificationResults, verifyDocument: verifyDoc, resetVerification } = useDocumentVerification(formData.fullName)

 // Listen for custom events to open modals
 useEffect(() => {
 const handleOpenTerms = () => setTermsOpen(true)
 const handleOpenPrivacy = () => setPrivacyOpen(true)
 const handleOpenDisclaimer = () => setDisclaimerOpen(true)

 window.addEventListener('openTerms', handleOpenTerms)
 window.addEventListener('openPrivacy', handleOpenPrivacy)
 window.addEventListener('openDisclaimer', handleOpenDisclaimer)

 return () => {
 window.removeEventListener('openTerms', handleOpenTerms)
 window.removeEventListener('openPrivacy', handleOpenPrivacy)
 window.removeEventListener('openDisclaimer', handleOpenDisclaimer)
 }
 }, [])

 // Capture referral params from URL and record click
 useEffect(() => {
 const params = captureReferralParams()
 if (params?.promo) {
 fetch('/api/referral-tracking', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 referralCode: params.promo,
 utmSource: params.utm_source,
 utmMedium: params.utm_medium,
 utmCampaign: params.utm_campaign,
 location: params.location,
 landingPage: params.landing_page,
 }),
 })
 .then(res => res.json())
 .then(json => {
 if (json.success && json.data?.trackingId) {
 setTrackingId(json.data.trackingId)
 }
 })
 .catch(() => { /* silent */ })
 }
 }, [])

 const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
 const { name, value, type } = e.target
 if (type === 'checkbox') {
 const checked = (e.target as HTMLInputElement).checked
 setFormData(prev => ({
 ...prev,
 [name]: checked
 }))
 } else {
 setFormData(prev => ({
 ...prev,
 [name]: value
 }))
 }
 }

 const handleUserTypeChange = (userTypeId: string) => {
 setSelectedUserType(userTypeId)
 setFormData(prev => ({ ...prev, userType: userTypeId }))
 setDocuments(documentRequirements[userTypeId] || [])
 }

 const handleFileUpload = (documentId: string, file: File) => {
 setDocuments(prev => prev.map(doc =>
 doc.id === documentId
 ? { ...doc, file, uploaded: true }
 : doc
 ))
 // Trigger OCR verification if user has entered their name
 if (formData.fullName.trim().length >= 2) {
 verifyDoc(documentId, file)
 }
 }

 const removeFile = (documentId: string) => {
 setDocuments(prev => prev.map(doc =>
 doc.id === documentId
 ? { ...doc, file: undefined, uploaded: false }
 : doc
 ))
 resetVerification(documentId)
 }

 const handleSkipDocument = (documentId: string, skipped: boolean) => {
 setDocuments(prev => prev.map(doc =>
 doc.id === documentId
 ? { ...doc, skipped, ...(skipped ? { file: undefined, uploaded: false } : {}) }
 : doc
 ))
 if (skipped) {
 resetVerification(documentId)
 }
 }

 const validateStep = (step: number): boolean => {
 switch (step) {
 case 1:
 return selectedUserType !== ''
 case 2:
 // Base validation for all users
 const baseValid = !!(formData.fullName && formData.email && formData.password &&
 formData.confirmPassword && formData.phone && formData.dateOfBirth &&
 formData.gender && formData.address)

 if (!baseValid) return false

 // Additional validation for specific user types
 if (formData.userType === 'corporate') {
 return !!(formData.companyName && formData.jobTitle && formData.companyAddress)
 }

 if (formData.userType === 'regional-admin') {
 return !!(formData.targetCountry && formData.businessPlan)
 }

 return true
 case 3:
 const requiredDocs = documents.filter(doc => doc.required)
 return requiredDocs.every(doc => doc.uploaded || doc.skipped)
 case 4:
 // Plan selection is optional — always valid
 return true
 case 5:
 // For step 5, we just need the required documents uploaded or skipped
 // The checkboxes will be validated in handleSubmit
 const step5RequiredDocs = documents.filter(doc => doc.required)
 return step5RequiredDocs.every(doc => doc.uploaded || doc.skipped)
 default:
 return true
 }
 }

 const nextStep = () => {
 if (validateStep(currentStep)) {
 setCurrentStep(prev => Math.min(prev + 1, 5))
 }
 }

 const prevStep = () => {
 setCurrentStep(prev => Math.max(prev - 1, 1))
 }

 const handleSubmit = async (e: FormEvent) => {
 e.preventDefault()

 setIsSubmitting(true)
 setSubmissionError(null)

 try {
 // Build document verification summary
 const documentVerifications = Object.values(verificationResults).map(v => ({
 documentId: v.documentId,
 verified: v.status === 'verified',
 confidence: v.confidence,
 }))

 // Collect skipped document IDs
 const skippedDocuments = documents
 .filter(doc => doc.required && doc.skipped)
 .map(doc => doc.id)

 // Upload document files and collect URLs for database storage
 const documentUrls: { name: string; type: string; url: string; size?: number }[] = []
 for (const doc of documents) {
 if (doc.file && doc.uploaded && !doc.skipped) {
 try {
 const fd = new FormData()
 fd.append('file', doc.file)
 const uploadRes = await fetch('/api/upload/registration', { method: 'POST', body: fd })
 const uploadResult = await uploadRes.json()
 if (uploadResult.success) {
 documentUrls.push({
 name: doc.name,
 type: doc.id,
 url: uploadResult.data.url,
 size: uploadResult.data.size,
 })
 }
 } catch {
 // Continue with other documents if one fails
 }
 }
 }

 const response = await fetch('/api/auth/register', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 ...formData,
 profileImage: formData.profileImageUrl || undefined,
 documentUrls,
 documentVerifications,
 skippedDocuments,
 trackingId: getTrackingId() || undefined,
 }),
 })

 const result = await response.json()

 if (!response.ok || !result.success) {
 throw new Error(result.message || 'Registration failed')
 }

 // Clear referral tracking data
 clearReferralTracking()

 // Set success state
 setSubmissionSuccess(true)

 // Wait a moment to show success, then redirect
 setTimeout(() => {
 router.push('/login?registration=success')
 }, 2000)

 } catch (error) {
 console.error('Registration error:', error)
 const message = error instanceof Error ? error.message : 'Registration failed. Please try again later or contact support.'
 setSubmissionError(message)
 } finally {
 setIsSubmitting(false)
 }
 }

 const selectedType = userTypes.find(type => type.id === selectedUserType)

 return (
 <div className="min-h-screen via-white py-4 sm:py-8">
 <div className="container mx-auto px-3 sm:px-4">
 <div className="max-w-4xl mx-auto">
 {/* Header */}
 <div className="text-center mb-4 sm:mb-8">
 <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Join MediWyz</h1>
 <p className="text-gray-600 text-sm sm:text-base md:text-lg">Create your professional healthcare account</p>
 </div>

 {/* Progress Steps */}
 <ProgressSteps currentStep={currentStep} />

 {/* Step Content */}
 <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
 {/* Success Display */}
 {submissionSuccess && (
 <div className="text-center py-12">
 <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
 <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 <h2 className="text-3xl font-bold text-green-600 mb-4">Registration Submitted Successfully!</h2>
 <div className="max-w-md mx-auto">
 <p className="text-gray-600 mb-4">
 Your registration has been received and is being processed.
 </p>
 {documents.some(doc => doc.skipped) && (
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
 <p className="text-amber-800 text-sm">
 You have deferred {documents.filter(doc => doc.skipped).length} document{documents.filter(doc => doc.skipped).length > 1 ? 's' : ''}.
 Please upload them from your account settings to complete your verification.
 </p>
 </div>
 )}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
 <p className="text-blue-800 text-sm">
 {formData.userType === 'corporate' || formData.userType === 'regional-admin'
 ? 'Your account requires super administrator approval and will be reviewed within 2-5 business days.'
 : documents.some(doc => doc.skipped)
 ? 'Your account is pending until all required documents are provided and verified.'
 : 'Your account will be verified within 2-5 business days.'
 }
 </p>
 </div>
 <p className="text-gray-500 text-sm">
 You will receive a confirmation email shortly. Redirecting to login page...
 </p>
 <div className="mt-4">
 <div className="flex justify-center">
 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Regular Form Steps */}
 {!submissionSuccess && (
 <>
 {/* Step 1: Account Type Selection */}
 {currentStep === 1 && (
 <AccountTypeStep 
 selectedUserType={selectedUserType} 
 onUserTypeChange={handleUserTypeChange} 
 />
 )}

 {/* Step 2: Basic Information */}
 {currentStep === 2 && (
 <BasicInfoStep
 formData={formData}
 selectedType={selectedType}
 showPassword={showPassword}
 showConfirmPassword={showConfirmPassword}
 onFormChange={handleChange}
 onPasswordToggle={() => setShowPassword(!showPassword)}
 onConfirmPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
 onProfileImageChange={(url) => setFormData(prev => ({ ...prev, profileImageUrl: url }))}
 />
 )}

 {/* Step 3: Document Upload */}
 {currentStep === 3 && (
 <DocumentUploadStep
 documents={documents}
 onFileUpload={handleFileUpload}
 onRemoveFile={removeFile}
 onSkipDocument={handleSkipDocument}
 verificationResults={verificationResults}
 />
 )}

 {/* Step 4: Plan Selection */}
 {currentStep === 4 && (
 <SubscriptionStep
 regionId={formData.regionId}
 userType={formData.userType}
 selectedPlanId={formData.selectedPlanId}
 selectedBusinessPlanId={formData.selectedBusinessPlanId}
 onSelectPlan={(id) => setFormData(prev => ({ ...prev, selectedPlanId: id }))}
 onSelectBusinessPlan={(id) => setFormData(prev => ({ ...prev, selectedBusinessPlanId: id }))}
 />
 )}

 {/* Step 5: Verification */}
 {currentStep === 5 && (
 <VerificationStep
 formData={formData}
 selectedType={selectedType}
 documents={documents}
 verificationResults={verificationResults}
 onFormChange={handleChange}
 />
 )}

 {/* Inline submission error */}
 {submissionError && (
 <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
 <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <div className="flex-1">
 <p className="text-red-700 text-sm font-medium">Registration failed</p>
 <p className="text-red-600 text-sm mt-0.5">{submissionError}</p>
 </div>
 <button
 type="button"
 onClick={() => setSubmissionError(null)}
 className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0"
 aria-label="Dismiss error"
 >
 &times;
 </button>
 </div>
 )}

 {/* Navigation Buttons */}
 <NavigationButtons
 currentStep={currentStep}
 isSubmitting={isSubmitting}
 canProceed={validateStep(currentStep)}
 onPrevious={prevStep}
 onNext={nextStep}
 onSubmit={handleSubmit}
 />
 </>
 )}
 </div>

 {/* Help Section */}
 {!submissionSuccess && (
 <>
 <div className="text-center mt-8">
 <p className="text-gray-600 text-sm">
 Already have an account?{' '}
 <Link href="/login" className="text-brand-teal hover:underline font-medium">
 Sign in here
 </Link>
 </p>
 <p className="text-gray-500 text-xs mt-2">
 Need help with registration?{' '}
 <Link href="/support" className="text-brand-teal hover:underline">
 Contact Support
 </Link>{' '}
 or call +230 400 4000
 </p>
 </div>

 {/* Legal Information Preview Buttons */}
 <div className="mt-6 text-center">
 <p className="text-gray-600 text-sm mb-3">Review our legal documents before registration:</p>
 <div className="flex justify-center gap-4 flex-wrap">
 <button
 type="button"
 onClick={() => setDisclaimerOpen(true)}
 className="text-red-600 hover:text-red-800 text-sm font-medium underline"
 >
 Medical Disclaimer
 </button>
 <button
 type="button"
 onClick={() => setTermsOpen(true)}
 className="text-brand-teal hover:text-blue-800 text-sm font-medium underline"
 >
 Terms of Service
 </button>
 <button
 type="button"
 onClick={() => setPrivacyOpen(true)}
 className="text-green-600 hover:text-green-800 text-sm font-medium underline"
 >
 Privacy Policy
 </button>
 </div>
 </div>
 </>
 )}
 </div>

 {/* Legal Modals */}
 <LegalModals
 disclaimerOpen={disclaimerOpen}
 termsOpen={termsOpen}
 privacyOpen={privacyOpen}
 onCloseDisclaimer={() => setDisclaimerOpen(false)}
 onCloseTerms={() => setTermsOpen(false)}
 onClosePrivacy={() => setPrivacyOpen(false)}
 />
 </div>
 </div>
 )
}