'use client'

import ServiceCatalogManager from '@/components/shared/ServiceCatalogManager'
import type { ServiceCatalogConfig } from '@/components/shared/ServiceCatalogManager'

const CATEGORIES = [
  { value: 'Dispensing', label: 'Dispensing' },
  { value: 'Consultation', label: 'Consultation' },
  { value: 'Vaccination', label: 'Vaccination' },
  { value: 'Screening', label: 'Screening' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Other', label: 'Other' },
]

const config: ServiceCatalogConfig = {
  title: 'My Services',
  apiBasePath: '/api/services/my-services',
  createApiPath: '/api/services/custom',
  categoryOptions: CATEGORIES,
  providerType: 'PHARMACIST',
  workflowCreateHref: '/pharmacist/workflows/create',
  accentColor: 'teal',
  fields: [
    { key: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'e.g. Prescription Dispensing' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: CATEGORIES },
    { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the service...' },
    { key: 'price', label: 'Price (MUR)', type: 'number', required: true, placeholder: '0' },
    { key: 'duration', label: 'Duration (minutes)', type: 'number', placeholder: '15', defaultValue: 15 },
    { key: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
  ],
}

export default function PharmacistServicesPage() {
  return <ServiceCatalogManager config={config} />
}
