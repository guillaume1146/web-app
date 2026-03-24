'use client'

import React, { useState } from 'react'
import {
 FaCog,
 FaBell,
 FaLock,
 FaLanguage,
 FaCreditCard,
 FaShieldAlt,
 FaUser,
 FaEnvelope,
 FaSms,
 FaMobile,
 FaVolumeUp,
 FaMobileAlt,
 FaCalendarAlt,
 FaSave,
 FaTimes,
 FaKey,
 FaDatabase,
 FaRocket,
 FaCrown,
 FaStar,
 FaCheckCircle,
 FaExclamationTriangle,
 FaTrash,
 FaDownload,
 FaUpload,
 FaSync,
 FaQrcode,
 FaMoon,
 FaPhone
} from 'react-icons/fa'

/* ---------- Types ---------- */

type Visibility = 'public' | 'patients_only' | 'private'
type TimeFormat = '12h' | '24h'
type BillingCycle = 'monthly' | 'yearly' | string
type PlanType = 'free' | 'premium' | 'enterprise' | string

interface NotificationSettings {
 appointments: boolean
 newPatients: boolean
 emergencyAlerts: boolean
 emailNotifications: boolean
 smsNotifications: boolean
 pushNotifications: boolean
 notificationTime: string // 'HH:mm'
 soundEnabled: boolean
 vibrationEnabled: boolean
}

interface PrivacySettings {
 profileVisibility: Visibility
 showContactInfo: boolean
 allowReviews: boolean
 twoFactorAuth: boolean
 sessionTimeout: number
 shareDataForResearch: boolean
}

interface LanguageSettings {
 preferredLanguage: string
 timezone: string
 currency: string
 dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | string
 timeFormat: TimeFormat
}

interface UsageCounters {
 used?: number
 limit?: number // -1 can mean unlimited
}

interface SubscriptionUsage {
 consultations?: UsageCounters
 storage?: UsageCounters
 smsNotifications?: UsageCounters
}

interface Subscription {
 type?: PlanType
 planName?: string
 billingCycle?: BillingCycle
 price?: number
 nextBillingDate?: string
 autoRenew?: boolean
 features?: string[]
 usage?: SubscriptionUsage
}

interface DoctorData {
 id?: string
 registrationDate?: string
 lastLogin?: string
 accountStatus?: string
 notificationSettings?: Partial<NotificationSettings>
 privacySettings?: Partial<PrivacySettings>
 languageSettings?: Partial<LanguageSettings>
 subscription?: Partial<Subscription>
 [key: string]: unknown
}

interface Settings {
 notifications: NotificationSettings
 privacy: PrivacySettings
 language: LanguageSettings
 subscription: Subscription
 darkMode: boolean
 autoSave: boolean
}

interface Props {
 doctorData: DoctorData
 setDoctorData: (data: DoctorData) => void
}

/* ---------- Defaults ---------- */

const defaultNotifications: NotificationSettings = {
 appointments: true,
 newPatients: true,
 emergencyAlerts: true,
 emailNotifications: true,
 smsNotifications: false,
 pushNotifications: true,
 notificationTime: '08:00',
 soundEnabled: true,
 vibrationEnabled: true
}

const defaultPrivacy: PrivacySettings = {
 profileVisibility: 'public',
 showContactInfo: false,
 allowReviews: true,
 twoFactorAuth: false,
 sessionTimeout: 30,
 shareDataForResearch: false
}

const defaultLanguage: LanguageSettings = {
 preferredLanguage: 'en',
 timezone: 'Indian/Mauritius',
 currency: 'MUR',
 dateFormat: 'DD/MM/YYYY',
 timeFormat: '24h'
}

const defaultSubscription: Subscription = {
 type: 'free',
 planName: 'Free',
 billingCycle: 'monthly',
 price: 0,
 nextBillingDate: '',
 autoRenew: false,
 features: [],
 usage: {}
}

/* ---------- Component ---------- */

const DoctorSettings: React.FC<Props> = ({ doctorData, setDoctorData }) => {
 const [activeTab, setActiveTab] = useState<'notifications' | 'privacy' | 'language' | 'subscription' | 'account'>(
 'notifications'
 )
 const initialSettings: Settings = {
 notifications: { ...defaultNotifications, ...(doctorData.notificationSettings ?? {}) },
 privacy: { ...defaultPrivacy, ...(doctorData.privacySettings ?? {}) },
 language: { ...defaultLanguage, ...(doctorData.languageSettings ?? {}) },
 subscription: { ...defaultSubscription, ...(doctorData.subscription ?? {}) },
 darkMode: false,
 autoSave: true
 }

 const [settings, setSettings] = useState<Settings>(initialSettings)
 const [hasChanges, setHasChanges] = useState(false)

 const sections = [
 { id: 'notifications', label: 'Notifications', icon: FaBell, color: 'blue' },
 { id: 'privacy', label: 'Privacy & Security', icon: FaLock, color: 'green' },
 { id: 'language', label: 'Language & Region', icon: FaLanguage, color: 'purple' },
 { id: 'subscription', label: 'Subscription', icon: FaCreditCard, color: 'orange' },
 { id: 'account', label: 'Account', icon: FaUser, color: 'red' }
 ] as const

 // Type-safe updaters
 const updateNotifications = <K extends keyof NotificationSettings>(field: K, value: NotificationSettings[K]) => {
 setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, [field]: value } }))
 setHasChanges(true)
 }
 const updatePrivacy = <K extends keyof PrivacySettings>(field: K, value: PrivacySettings[K]) => {
 setSettings((prev) => ({ ...prev, privacy: { ...prev.privacy, [field]: value } }))
 setHasChanges(true)
 }
 const updateLanguage = <K extends keyof LanguageSettings>(field: K, value: LanguageSettings[K]) => {
 setSettings((prev) => ({ ...prev, language: { ...prev.language, [field]: value } }))
 setHasChanges(true)
 }
 const updateSubscription = <K extends keyof Subscription>(field: K, value: Subscription[K]) => {
 setSettings((prev) => ({ ...prev, subscription: { ...prev.subscription, [field]: value } }))
 setHasChanges(true)
 }

 const saveSettings = () => {
 const updatedData: DoctorData = {
 ...doctorData,
 notificationSettings: settings.notifications,
 privacySettings: settings.privacy,
 languageSettings: settings.language,
 subscription: settings.subscription
 }
 setDoctorData(updatedData)
 if (typeof window !== 'undefined') {
 localStorage.setItem('mediwyz_user', JSON.stringify(updatedData))
 }
 setHasChanges(false)
 }

 const resetSettings = () => {
 setSettings(initialSettings)
 setHasChanges(false)
 }

 const renderToggle = (value: boolean, onChange: () => void) => (
 <button
 onClick={onChange}
 className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
 value ? 'bg-white' : 'bg-gray-300'
 }`}
 type="button"
 >
 <span
 className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${
 value ? 'translate-x-6' : 'translate-x-1'
 }`}
 />
 </button>
 )

 const renderNotifications = () => (
 <div className="space-y-4 sm:space-y-6">
 {/* Appointment Notifications */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Appointment Notifications</h3>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaCalendarAlt className="text-blue-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">New Appointments</p>
 <p className="text-xs text-gray-600">Get notified when patients book appointments</p>
 </div>
 </div>
 {renderToggle(settings.notifications.appointments, () =>
 updateNotifications('appointments', !settings.notifications.appointments)
 )}
 </div>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaUser className="text-green-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">New Patients</p>
 <p className="text-xs text-gray-600">Alerts for new patient registrations</p>
 </div>
 </div>
 {renderToggle(settings.notifications.newPatients, () =>
 updateNotifications('newPatients', !settings.notifications.newPatients)
 )}
 </div>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaExclamationTriangle className="text-orange-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Emergency Alerts</p>
 <p className="text-xs text-gray-600">Critical patient notifications</p>
 </div>
 </div>
 {renderToggle(settings.notifications.emergencyAlerts, () =>
 updateNotifications('emergencyAlerts', !settings.notifications.emergencyAlerts)
 )}
 </div>
 </div>
 </div>

 {/* Communication Preferences */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Communication Preferences</h3>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaEnvelope className="text-blue-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Email Notifications</p>
 <p className="text-xs text-gray-600">Receive updates via email</p>
 </div>
 </div>
 {renderToggle(settings.notifications.emailNotifications, () =>
 updateNotifications('emailNotifications', !settings.notifications.emailNotifications)
 )}
 </div>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaSms className="text-green-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">SMS Notifications</p>
 <p className="text-xs text-gray-600">Text message alerts</p>
 </div>
 </div>
 {renderToggle(settings.notifications.smsNotifications, () =>
 updateNotifications('smsNotifications', !settings.notifications.smsNotifications)
 )}
 </div>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaMobile className="text-purple-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Push Notifications</p>
 <p className="text-xs text-gray-600">Mobile app notifications</p>
 </div>
 </div>
 {renderToggle(settings.notifications.pushNotifications, () =>
 updateNotifications('pushNotifications', !settings.notifications.pushNotifications)
 )}
 </div>
 </div>
 </div>

 {/* Notification Settings */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Notification Settings</h3>

 <div className="space-y-4">
 <div>
 <label className="text-sm font-medium text-gray-700 mb-2 block">Notification Time</label>
 <input
 type="time"
 value={settings.notifications.notificationTime}
 onChange={(e) => updateNotifications('notificationTime', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 />
 </div>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaVolumeUp className="text-purple-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Sound</p>
 <p className="text-xs text-gray-600">Play notification sounds</p>
 </div>
 </div>
 {renderToggle(settings.notifications.soundEnabled, () =>
 updateNotifications('soundEnabled', !settings.notifications.soundEnabled)
 )}
 </div>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaMobileAlt className="text-pink-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Vibration</p>
 <p className="text-xs text-gray-600">Vibrate on notifications</p>
 </div>
 </div>
 {renderToggle(settings.notifications.vibrationEnabled, () =>
 updateNotifications('vibrationEnabled', !settings.notifications.vibrationEnabled)
 )}
 </div>
 </div>
 </div>
 </div>
 )

 const renderPrivacy = () => (
 <div className="space-y-4 sm:space-y-6">
 {/* Profile Privacy */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Profile Privacy</h3>

 <div className="space-y-4">
 <div>
 <label className="text-sm font-medium text-gray-700 mb-2 block">Profile Visibility</label>
 <select
 value={settings.privacy.profileVisibility}
 onChange={(e) => updatePrivacy('profileVisibility', e.target.value as Visibility)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 >
 <option value="public">Public</option>
 <option value="patients_only">Patients Only</option>
 <option value="private">Private</option>
 </select>
 </div>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaPhone className="text-green-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Show Contact Info</p>
 <p className="text-xs text-gray-600">Display phone and email publicly</p>
 </div>
 </div>
 {renderToggle(settings.privacy.showContactInfo, () =>
 updatePrivacy('showContactInfo', !settings.privacy.showContactInfo)
 )}
 </div>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaStar className="text-yellow-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Allow Reviews</p>
 <p className="text-xs text-gray-600">Let patients leave reviews</p>
 </div>
 </div>
 {renderToggle(settings.privacy.allowReviews, () =>
 updatePrivacy('allowReviews', !settings.privacy.allowReviews)
 )}
 </div>
 </div>
 </div>

 {/* Security Settings */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Security Settings</h3>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaShieldAlt className="text-red-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Two-Factor Authentication</p>
 <p className="text-xs text-gray-600">Add extra security to your account</p>
 </div>
 </div>
 {renderToggle(settings.privacy.twoFactorAuth, () =>
 updatePrivacy('twoFactorAuth', !settings.privacy.twoFactorAuth)
 )}
 </div>

 {settings.privacy.twoFactorAuth && (
 <div className="bg-white/80 rounded-lg p-3 border border-red-200">
 <button className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700" type="button">
 <FaQrcode />
 Setup 2FA with Authenticator App
 </button>
 </div>
 )}

 <div>
 <label className="text-sm font-medium text-gray-700 mb-2 block">Session Timeout (minutes)</label>
 <input
 type="number"
 value={settings.privacy.sessionTimeout}
 onChange={(e) => updatePrivacy('sessionTimeout', parseInt(e.target.value, 10) || 0)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 min={5}
 max={120}
 />
 </div>

 <button
 className="w-full px-4 py-2 bg-white transition text-sm"
 type="button"
 >
 <FaKey className="inline mr-2" />
 Change Password
 </button>
 </div>
 </div>

 {/* Data Privacy */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Data Privacy</h3>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaDatabase className="text-blue-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Share Data for Research</p>
 <p className="text-xs text-gray-600">Contribute anonymized data for medical research</p>
 </div>
 </div>
 {renderToggle(settings.privacy.shareDataForResearch, () =>
 updatePrivacy('shareDataForResearch', !settings.privacy.shareDataForResearch)
 )}
 </div>

 <div className="space-y-2">
 <button
 className="w-full px-4 py-2 bg-sky-50 transition text-sm flex items-center justify-center gap-2"
 type="button"
 >
 <FaDownload />
 Download My Data
 </button>
 <button
 className="w-full px-4 py-2 bg-sky-50 text-red-700 rounded-lg transition text-sm flex items-center justify-center gap-2"
 type="button"
 >
 <FaTrash />
 Delete My Account
 </button>
 </div>
 </div>
 </div>
 </div>
 )

 const renderLanguage = () => (
 <div className="space-y-4 sm:space-y-6">
 {/* Language Preferences */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Language Preferences</h3>

 <div className="space-y-4">
 <div>
 <label className="text-sm font-medium text-gray-700 mb-2 block">Preferred Language</label>
 <select
 value={settings.language.preferredLanguage}
 onChange={(e) => updateLanguage('preferredLanguage', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 >
 <option value="en">English</option>
 <option value="fr">French</option>
 <option value="cr">Creole</option>
 <option value="hi">Hindi</option>
 <option value="zh">Chinese</option>
 </select>
 </div>

 <div>
 <label className="text-sm font-medium text-gray-700 mb-2 block">Timezone</label>
 <select
 value={settings.language.timezone}
 onChange={(e) => updateLanguage('timezone', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 >
 <option value="Indian/Mauritius">Indian/Mauritius (UTC+4)</option>
 <option value="UTC">UTC</option>
 <option value="Europe/London">Europe/London</option>
 <option value="America/New_York">America/New York</option>
 </select>
 </div>

 <div>
 <label className="text-sm font-medium text-gray-700 mb-2 block">Currency</label>
 <select
 value={settings.language.currency}
 onChange={(e) => updateLanguage('currency', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 >
 <option value="MUR">MUR - Mauritian Rupee</option>
 <option value="USD">USD - US Dollar</option>
 <option value="EUR">EUR - Euro</option>
 <option value="GBP">GBP - British Pound</option>
 </select>
 </div>
 </div>
 </div>

 {/* Format Preferences */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-orange-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Format Preferences</h3>

 <div className="space-y-4">
 <div>
 <label className="text-sm font-medium text-gray-700 mb-2 block">Date Format</label>
 <select
 value={settings.language.dateFormat}
 onChange={(e) => updateLanguage('dateFormat', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
 >
 <option value="DD/MM/YYYY">DD/MM/YYYY</option>
 <option value="MM/DD/YYYY">MM/DD/YYYY</option>
 <option value="YYYY-MM-DD">YYYY-MM-DD</option>
 </select>
 </div>

 <div>
 <label className="text-sm font-medium text-gray-700 mb-2 block">Time Format</label>
 <div className="grid grid-cols-2 gap-3">
 <button
 onClick={() => updateLanguage('timeFormat', '12h')}
 className={`px-4 py-2 rounded-lg text-sm transition ${
 settings.language.timeFormat === '12h'
 ? 'bg-brand-navy text-white'
 : 'bg-sky-50 text-orange-700'
 }`}
 type="button"
 >
 12 Hour
 </button>
 <button
 onClick={() => updateLanguage('timeFormat', '24h')}
 className={`px-4 py-2 rounded-lg text-sm transition ${
 settings.language.timeFormat === '24h'
 ? 'bg-brand-navy text-white'
 : 'bg-sky-50 text-orange-700'
 }`}
 type="button"
 >
 24 Hour
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 )

 const renderSubscription = () => (
 <div className="space-y-4 sm:space-y-6">
 {/* Current Plan */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-orange-200">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800">Current Plan</h3>
 {settings.subscription.type === 'premium' && (
 <span className="px-3 py-1 bg-brand-teal text-white rounded-full text-xs font-bold flex items-center gap-1">
 <FaCrown />
 Premium
 </span>
 )}
 </div>

 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Plan Name</span>
 <span className="text-sm font-semibold">{settings.subscription.planName}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Billing Cycle</span>
 <span className="text-sm font-semibold capitalize">{settings.subscription.billingCycle}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Price</span>
 <span className="text-sm font-semibold">Rs {settings.subscription.price}/month</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Next Billing</span>
 <span className="text-sm font-semibold">{settings.subscription.nextBillingDate}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Auto-Renew</span>
 {renderToggle(settings.subscription.autoRenew ?? false, () =>
 updateSubscription('autoRenew', !(settings.subscription.autoRenew ?? false))
 )}
 </div>
 </div>
 </div>

 {/* Features */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Plan Features</h3>
 <div className="space-y-2">
 {(settings.subscription.features ?? []).map((feature, index) => (
 <div key={`${feature}-${index}`} className="flex items-center gap-2">
 <FaCheckCircle className="text-green-500 flex-shrink-0" />
 <span className="text-sm text-gray-700">{feature}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Usage */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Usage Statistics</h3>
 <div className="space-y-3">
 {(() => {
 const consultUsed = settings.subscription.usage?.consultations?.used ?? 0
 const consultLimit = settings.subscription.usage?.consultations?.limit ?? 0
 const consultPct = consultLimit === -1 ? 0 : consultLimit > 0 ? Math.min(100, Math.round((consultUsed / consultLimit) * 100)) : 0

 const storageUsed = settings.subscription.usage?.storage?.used ?? 0
 const storageLimit = settings.subscription.usage?.storage?.limit ?? 0
 const storagePct = storageLimit > 0 ? Math.min(100, Math.round((storageUsed / storageLimit) * 100)) : 0

 const smsUsed = settings.subscription.usage?.smsNotifications?.used ?? 0
 const smsLimit = settings.subscription.usage?.smsNotifications?.limit ?? 0
 const smsPct = smsLimit > 0 ? Math.min(100, Math.round((smsUsed / smsLimit) * 100)) : 0

 return (
 <>
 <div>
 <div className="flex justify-between text-sm mb-1">
 <span>Consultations</span>
 <span>
 {consultUsed} /{' '}
 {consultLimit === -1 ? '∞' : consultLimit}
 </span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div className="bg-white h-2 rounded-full" style={{ width: `${consultPct}%` }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between text-sm mb-1">
 <span>Storage</span>
 <span>{storageUsed} GB / {storageLimit} GB</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div className="bg-white h-2 rounded-full" style={{ width: `${storagePct}%` }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between text-sm mb-1">
 <span>SMS Notifications</span>
 <span>{smsUsed} / {smsLimit}</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div className="bg-white h-2 rounded-full" style={{ width: `${smsPct}%` }} />
 </div>
 </div>
 </>
 )
 })()}
 </div>
 </div>

 {/* Upgrade Options */}
 <button
 className="w-full px-4 py-3 bg-white transition flex items-center justify-center gap-2 text-sm font-semibold"
 type="button"
 >
 <FaRocket />
 Upgrade to Enterprise
 </button>
 </div>
 )

 const renderAccount = () => (
 <div className="space-y-4 sm:space-y-6">
 {/* Account Information */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Account Information</h3>

 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">User ID</span>
 <span className="text-sm font-mono">{doctorData.id ?? '—'}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Registration Date</span>
 <span className="text-sm">{doctorData.registrationDate ?? '—'}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Last Login</span>
 <span className="text-sm">{doctorData.lastLogin ?? '—'}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Account Status</span>
 <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs capitalize">
 {doctorData.accountStatus ?? 'active'}
 </span>
 </div>
 </div>
 </div>

 {/* Appearance */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Appearance</h3>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaMoon className="text-purple-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Dark Mode</p>
 <p className="text-xs text-gray-600">Use dark theme</p>
 </div>
 </div>
 {renderToggle(settings.darkMode, () => {
 setSettings((s) => ({ ...s, darkMode: !s.darkMode }))
 setHasChanges(true)
 })}
 </div>

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <FaSave className="text-green-500" />
 <div>
 <p className="text-sm font-medium text-gray-800">Auto-Save</p>
 <p className="text-xs text-gray-600">Automatically save changes</p>
 </div>
 </div>
 {renderToggle(settings.autoSave, () => {
 setSettings((s) => ({ ...s, autoSave: !s.autoSave }))
 setHasChanges(true)
 })}
 </div>
 </div>
 </div>

 {/* Data Management */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Data Management</h3>

 <div className="space-y-3">
 <button
 className="w-full px-4 py-2 bg-sky-50 transition text-sm flex items-center justify-center gap-2"
 type="button"
 >
 <FaDownload />
 Export All Data
 </button>
 <button
 className="w-full px-4 py-2 bg-sky-50 transition text-sm flex items-center justify-center gap-2"
 type="button"
 >
 <FaUpload />
 Import Data
 </button>
 <button
 className="w-full px-4 py-2 bg-sky-50 text-orange-700 rounded-lg transition text-sm flex items-center justify-center gap-2"
 type="button"
 >
 <FaSync />
 Sync Data
 </button>
 </div>
 </div>
 </div>
 )

 return (
 <div className="space-y-4 sm:space-y-5 md:space-y-6">
 {/* Header */}
 <div className="bg-brand-navy rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-white">
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
 <div>
 <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 flex items-center">
 <FaCog className="mr-2 sm:mr-3" />
 Settings
 </h2>
 <p className="opacity-90 text-xs sm:text-sm md:text-base">Manage your account preferences</p>
 </div>
 {hasChanges && (
 <div className="flex gap-2">
 <button
 onClick={saveSettings}
 className="px-4 py-2 bg-sky-100 transition flex items-center gap-2 text-sm"
 type="button"
 >
 <FaSave />
 Save Changes
 </button>
 <button
 onClick={resetSettings}
 className="px-4 py-2 bg-sky-100 transition flex items-center gap-2 text-sm"
 type="button"
 >
 <FaTimes />
 Cancel
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Mobile Accordion / Desktop Tabs */}
 <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
 {/* Desktop Tab Navigation */}
 <div className="hidden sm:block border-b border-gray-200">
 <div className="flex overflow-x-auto">
 {sections.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex-shrink-0 px-4 md:px-6 py-3 md:py-4 text-center font-medium transition-all flex items-center gap-2 ${
 activeTab === tab.id
 ? `text-${tab.color}-600 border-b-2 border-current from-${tab.color}-50 to-transparent`
 : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
 }`}
 type="button"
 >
 <tab.icon className="text-sm md:text-base" />
 <span className="whitespace-nowrap text-sm md:text-base">{tab.label}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Content */}
 <div className="p-4 md:p-6 pb-20 sm:pb-0">
 {activeTab === 'notifications' && renderNotifications()}
 {activeTab === 'privacy' && renderPrivacy()}
 {activeTab === 'language' && renderLanguage()}
 {activeTab === 'subscription' && renderSubscription()}
 {activeTab === 'account' && renderAccount()}
 </div>
 </div>

 {/* Mobile Bottom Tab Bar */}
 <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-1 z-50 shadow-lg">
 {sections.map((section) => {
 const Icon = section.icon
 const isActive = activeTab === section.id
 return (
 <button key={section.id} onClick={() => setActiveTab(section.id as typeof activeTab)}
 className={`flex flex-col items-center justify-center p-1 min-w-[40px] ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
 <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
 {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-1" />}
 </button>
 )
 })}
 </div>
 </div>
 )
}

export default DoctorSettings
