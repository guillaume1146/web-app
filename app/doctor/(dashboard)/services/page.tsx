'use client'

import ServiceCatalogManager from '@/components/shared/ServiceCatalogManager'
import { DOCTOR_SERVICE_CATEGORIES } from '@/lib/validations/service-catalog'
import type { ServiceCatalogConfig } from '@/components/shared/ServiceCatalogManager'

const config: ServiceCatalogConfig = {
 title: 'My Services',
 apiBasePath: '/api/services/my-services',
 createApiPath: '/api/services/custom',
 categoryOptions: DOCTOR_SERVICE_CATEGORIES,
 accentColor: 'blue',
 providerType: 'DOCTOR',
 workflowCreateHref: '/doctor/workflows/create',
 fields: [
 { key: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'e.g. General Consultation' },
 {
 key: 'category', label: 'Category', type: 'select', required: true,
 options: DOCTOR_SERVICE_CATEGORIES,
 },
 { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the service...' },
 { key: 'price', label: 'Price (MUR)', type: 'number', required: true, placeholder: '0' },
 { key: 'duration', label: 'Duration (minutes)', type: 'number', placeholder: '30', defaultValue: 30 },
 { key: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
 ],
}

export default function DoctorServicesPage() {
 return <ServiceCatalogManager config={config} />
}
