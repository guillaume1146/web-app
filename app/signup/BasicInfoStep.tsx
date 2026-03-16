import { ChangeEvent, useState, useEffect, useRef } from 'react'
import { FaEye, FaEyeSlash, FaUsers, FaCamera, FaBuilding } from 'react-icons/fa'
import { SignupFormData, UserType } from './types'

interface Company {
  id: string
  companyName: string
}

interface Region {
  id: string
  name: string
  countryCode: string
  language: string
  flag: string | null
}

interface BasicInfoStepProps {
  formData: SignupFormData;
  selectedType: UserType | undefined;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onFormChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onPasswordToggle: () => void;
  onConfirmPasswordToggle: () => void;
  onProfileImageChange?: (url: string) => void;
}

export default function BasicInfoStep({
  formData,
  selectedType,
  showPassword,
  showConfirmPassword,
  onFormChange,
  onPasswordToggle,
  onConfirmPasswordToggle,
  onProfileImageChange,
}: BasicInfoStepProps) {
  const SelectedIcon = selectedType?.icon
  const [regions, setRegions] = useState<Region[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [profilePreview, setProfilePreview] = useState<string | null>(formData.profileImageUrl || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/regions')
      .then(res => res.json())
      .then(result => {
        if (result.success) setRegions(result.data)
      })
      .catch(() => {})
  }, [])

  // Fetch companies for patient corporate enrollment
  useEffect(() => {
    if (formData.userType !== 'patient') return
    fetch('/api/corporate/companies')
      .then(res => res.json())
      .then(result => {
        if (result.success) setCompanies(result.data)
      })
      .catch(() => {})
  }, [formData.userType])

  const handleProfileImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => setProfilePreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to server
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/registration', { method: 'POST', body: fd })
      const result = await res.json()
      if (result.success) {
        onProfileImageChange?.(result.data.url)
      }
    } catch {
      // Silently fail — user can try again
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        {/* Profile Picture Upload */}
        <div
          className={`relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer group overflow-hidden ${selectedType?.color}`}
          onClick={() => fileInputRef.current?.click()}
        >
          {profilePreview ? (
            <img src={profilePreview} alt="Profile" className="w-full h-full object-cover rounded-full" />
          ) : (
            SelectedIcon && <SelectedIcon className="text-3xl" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            {uploadingImage ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <FaCamera className="text-white text-lg" />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleProfileImageUpload}
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{selectedType?.label} Registration</h2>
          <p className="text-gray-600">Please provide your basic information</p>
          <p className="text-xs text-blue-500 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            Click avatar to upload profile picture
          </p>
        </div>
      </div>

      <form className="space-y-6">
        {/* Region Selection */}
        {regions.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Select Your Region</h3>
            <select
              name="regionId"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-green-600"
              value={formData.regionId || ''}
              onChange={onFormChange}
            >
              <option value="">Select your country/region</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>
                  {r.flag ? `${r.flag} ` : ''}{r.name}
                </option>
              ))}
            </select>
            <p className="text-gray-500 text-sm mt-2">
              This helps connect you with healthcare providers in your area.
            </p>
          </div>
        )}

        {/* Referral Code Section - Universal for all user types */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaUsers className="text-blue-600 text-xl" />
            <h3 className="text-lg font-bold text-gray-900">Referral Information</h3>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
              Optional
            </span>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Referral Code or Email</label>
            <input
              type="text"
              name="referralCode"
              placeholder="Enter referral code or email of person who referred you"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
              value={formData.referralCode || ''}
              onChange={onFormChange}
            />
            <p className="text-gray-500 text-sm mt-2">
              If someone referred you to MediWyz, please enter their referral code or email address to give them credit.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Full Name *</label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Enter your full legal name"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
              value={formData.fullName}
              onChange={onFormChange}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Email Address *</label>
            <input
              type="email"
              name="email"
              required
              placeholder="Enter your email"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
              value={formData.email}
              onChange={onFormChange}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                placeholder="Create a strong password"
                className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:border-blue-600"
                value={formData.password}
                onChange={onFormChange}
              />
              <button
                type="button"
                onClick={onPasswordToggle}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                required
                placeholder="Confirm your password"
                className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:border-blue-600"
                value={formData.confirmPassword}
                onChange={onFormChange}
              />
              <button
                type="button"
                onClick={onConfirmPasswordToggle}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Phone Number *</label>
            <input
              type="tel"
              name="phone"
              required
              placeholder="+230 5xxx xxxx"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
              value={formData.phone}
              onChange={onFormChange}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Date of Birth *</label>
            <input
              type="date"
              name="dateOfBirth"
              required
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
              value={formData.dateOfBirth}
              onChange={onFormChange}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Gender *</label>
            <select
              name="gender"
              required
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
              value={formData.gender}
              onChange={onFormChange}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          {/* Doctor category selector */}
          {formData.userType === 'doctor' && (
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-medium mb-2">Doctor Category *</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => onFormChange({ target: { name: 'doctorCategory', value: 'general_practitioner', type: 'text' } } as ChangeEvent<HTMLInputElement>)}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    formData.doctorCategory === 'general_practitioner'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold">General Practitioner</p>
                  <p className="text-sm text-gray-500 mt-1">Family medicine, general consultations</p>
                </button>
                <button
                  type="button"
                  onClick={() => onFormChange({ target: { name: 'doctorCategory', value: 'specialist', type: 'text' } } as ChangeEvent<HTMLInputElement>)}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    formData.doctorCategory === 'specialist'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold">Specialist</p>
                  <p className="text-sm text-gray-500 mt-1">Cardiology, dermatology, etc.</p>
                </button>
              </div>
            </div>
          )}

          {/* Patient corporate enrollment */}
          {formData.userType === 'patient' && companies.length > 0 && (
            <div className="md:col-span-2">
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FaBuilding className="text-slate-600 text-xl" />
                  <h3 className="text-lg font-bold text-gray-900">Corporate Enrollment</h3>
                  <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-medium">
                    Optional
                  </span>
                </div>
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    name="enrolledInCompany"
                    checked={formData.enrolledInCompany || false}
                    onChange={onFormChange}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">I am enrolling through my company&apos;s wellness program</span>
                </label>
                {formData.enrolledInCompany && (
                  <select
                    name="companyId"
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                    value={formData.companyId || ''}
                    onChange={onFormChange}
                  >
                    <option value="">Select your company</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                )}
                <p className="text-gray-500 text-sm mt-2">
                  Your account will require corporate admin approval before activation.
                </p>
              </div>
            </div>
          )}

          {/* Corporate Administrator specific fields */}
          {formData.userType === 'corporate' && (
            <>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Company Name *</label>
                <input
                  type="text"
                  name="companyName"
                  required
                  placeholder="Enter your company name"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.companyName || ''}
                  onChange={onFormChange}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Job Title *</label>
                <input
                  type="text"
                  name="jobTitle"
                  required
                  placeholder="Your position in the company"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.jobTitle || ''}
                  onChange={onFormChange}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Company Registration Number</label>
                <input
                  type="text"
                  name="companyRegistrationNumber"
                  placeholder="Official company registration number"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.companyRegistrationNumber || ''}
                  onChange={onFormChange}
                />
              </div>
            </>
          )}

          {/* Regional Administrator specific fields */}
          {formData.userType === 'regional-admin' && (
            <>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Target Country *</label>
                <select
                  name="targetCountry"
                  required
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.targetCountry || ''}
                  onChange={(e) => {
                    onFormChange(e)
                    const opt = e.target.selectedOptions[0]
                    const code = opt?.getAttribute('data-code') || ''
                    onFormChange({ target: { name: 'countryCode', value: code, type: 'text' } } as ChangeEvent<HTMLInputElement>)
                  }}
                >
                  <option value="">Select Country</option>
                  <option value="Madagascar" data-code="MG">Madagascar</option>
                  <option value="Kenya" data-code="KE">Kenya</option>
                  <option value="India" data-code="IN">India</option>
                  <option value="France" data-code="FR">France</option>
                  <option value="Germany" data-code="DE">Germany</option>
                  <option value="United Kingdom" data-code="GB">United Kingdom</option>
                  <option value="United States" data-code="US">United States</option>
                  <option value="South Africa" data-code="ZA">South Africa</option>
                  <option value="Mauritius" data-code="MU">Mauritius</option>
                  <option value="Seychelles" data-code="SC">Seychelles</option>
                  <option value="Tanzania" data-code="TZ">Tanzania</option>
                  <option value="Uganda" data-code="UG">Uganda</option>
                  <option value="Nigeria" data-code="NG">Nigeria</option>
                  <option value="Ghana" data-code="GH">Ghana</option>
                  <option value="Senegal" data-code="SN">Senegal</option>
                  <option value="Morocco" data-code="MA">Morocco</option>
                  <option value="Egypt" data-code="EG">Egypt</option>
                  <option value="UAE" data-code="AE">UAE</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Target Region/State</label>
                <input
                  type="text"
                  name="targetRegion"
                  placeholder="Specific region or state (optional)"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.targetRegion || ''}
                  onChange={onFormChange}
                />
              </div>
            </>
          )}

          {/* Referral Partner specific fields */}
          {formData.userType === 'referral-partner' && (
            <>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Business Type</label>
                <select
                  name="businessType"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.businessType || ''}
                  onChange={onFormChange}
                >
                  <option value="">Select Business Type</option>
                  <option value="individual">Individual Marketer</option>
                  <option value="agency">Marketing Agency</option>
                  <option value="influencer">Social Media Influencer</option>
                  <option value="healthcare-related">Healthcare Related Business</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Marketing Experience</label>
                <select
                  name="marketingExperience"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.marketingExperience || ''}
                  onChange={onFormChange}
                >
                  <option value="">Select Experience</option>
                  <option value="beginner">Beginner (0-1 years)</option>
                  <option value="intermediate">Intermediate (2-5 years)</option>
                  <option value="experienced">Experienced (5+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Social Media Handles</label>
                <input
                  type="text"
                  name="socialMediaHandles"
                  placeholder="Your main social media profiles (optional)"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.socialMediaHandles || ''}
                  onChange={onFormChange}
                />
              </div>
            </>
          )}

          {/* Professional fields for healthcare workers */}
          {['doctor', 'nurse', 'pharmacist', 'lab', 'emergency'].includes(formData.userType) && (
            <>
              <div>
                <label className="block text-gray-700 font-medium mb-2">License/Registration Number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="Enter your professional license number"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.licenseNumber || ''}
                  onChange={onFormChange}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  {formData.userType === 'doctor' ? 'Specialization' : 
                   formData.userType === 'nurse' ? 'Area of Expertise' :
                   formData.userType === 'pharmacist' ? 'Pharmacy Type' :
                   'Area of Work'}
                </label>
                <input
                  type="text"
                  name="specialization"
                  placeholder={`Enter your ${formData.userType === 'doctor' ? 'medical specialization' : 'area of expertise'}`}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.specialization || ''}
                  onChange={onFormChange}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Institution/Workplace</label>
                <input
                  type="text"
                  name="institution"
                  placeholder="Enter your current workplace"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.institution || ''}
                  onChange={onFormChange}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Years of Experience</label>
                <select
                  name="experience"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                  value={formData.experience || ''}
                  onChange={onFormChange}
                >
                  <option value="">Select Experience</option>
                  <option value="0-1">0-1 years</option>
                  <option value="2-5">2-5 years</option>
                  <option value="6-10">6-10 years</option>
                  <option value="11-15">11-15 years</option>
                  <option value="16-20">16-20 years</option>
                  <option value="20+">20+ years</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">Full Address *</label>
          <textarea
            name="address"
            required
            rows={3}
            placeholder="Enter your complete address"
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
            value={formData.address}
            onChange={onFormChange}
          />
        </div>

        {/* Corporate Administrator company address */}
        {formData.userType === 'corporate' && (
          <div>
            <label className="block text-gray-700 font-medium mb-2">Company Address *</label>
            <textarea
              name="companyAddress"
              required
              rows={3}
              placeholder="Enter your company's complete address"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
              value={formData.companyAddress || ''}
              onChange={onFormChange}
            />
          </div>
        )}

        {/* Regional Administrator business plan */}
        {formData.userType === 'regional-admin' && (
          <div>
            <label className="block text-gray-700 font-medium mb-2">Business Plan Overview *</label>
            <textarea
              name="businessPlan"
              required
              rows={4}
              placeholder="Provide a brief overview of your business plan for managing MediWyz in your target region"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
              value={formData.businessPlan || ''}
              onChange={onFormChange}
            />
          </div>
        )}

        {/* Emergency Contact */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Emergency Contact Information</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Contact Name</label>
              <input
                type="text"
                name="emergencyContactName"
                placeholder="Full name"
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                value={formData.emergencyContactName || ''}
                onChange={onFormChange}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Contact Phone</label>
              <input
                type="tel"
                name="emergencyContactPhone"
                placeholder="+230 5xxx xxxx"
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                value={formData.emergencyContactPhone || ''}
                onChange={onFormChange}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Relationship</label>
              <select
                name="emergencyContactRelation"
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-600"
                value={formData.emergencyContactRelation || ''}
                onChange={onFormChange}
              >
                <option value="">Select Relationship</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}