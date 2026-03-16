import { ComponentType } from 'react'

export interface UserType {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; }>;
  description: string;
  color: string;
}

export interface Document {
  id: string;
  name: string;
  required: boolean;
  description: string;
  accepted: string;
  file?: File;
  uploaded?: boolean;
  skipped?: boolean;
}

export interface SignupFormData {
  // Basic Information
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;

  // User Type
  userType: string;

  // Region
  regionId?: string;

  // Profile Picture
  profileImageUrl?: string;

  // Referral Information (new field for all users)
  referralCode?: string;

  // Doctor category
  doctorCategory?: 'general_practitioner' | 'specialist';

  // Corporate enrollment (patient enrolling in company plan)
  enrolledInCompany?: boolean;
  companyId?: string;

  // Professional Information (conditional)
  licenseNumber?: string;
  specialization?: string;
  institution?: string;
  experience?: string;
  
  // Corporate Administrator specific
  companyName?: string;
  companyRegistrationNumber?: string;
  companyAddress?: string;
  jobTitle?: string;
  
  // Regional Administrator specific
  targetCountry?: string;
  targetRegion?: string;
  countryCode?: string;
  businessPlan?: string;
  
  // Referral Partner specific
  businessType?: string;
  marketingExperience?: string;
  socialMediaHandles?: string;
  
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  
  // Skipped Documents (document IDs the user chose to provide later)
  skippedDocuments?: string[];

  // Terms and Privacy Agreement (mandatory)
  agreeToTerms?: boolean;
  agreeToPrivacy?: boolean;
  agreeToDisclaimer?: boolean;
}