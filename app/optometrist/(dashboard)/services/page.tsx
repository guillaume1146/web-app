'use client'

import ServiceCatalogManager from '@/components/shared/ServiceCatalogManager'
import type { ServiceCatalogConfig } from '@/components/shared/ServiceCatalogManager'

const CATEGORIES = [
  { value: 'Consultation', label: 'Consultation' },
  { value: 'Treatment', label: 'Treatment' },
  { value: 'Assessment', label: 'Assessment' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Other', label: 'Other' },
]

const config: ServiceCatalogConfig = {
  title: 'My Services',
  apiBasePath: '/api/services/my-services',
  createApiPath: '/api/services/custom',
  categoryOptions: CATEGORIES,
  providerType: 'OPTOMETRIST',
  workflowCreateHref: '/optometrist/workflows/create',
  accentColor: 'teal',
  fields: [
    { key: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'e.g. Initial Consultation' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: CATEGORIES },
    { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the service...' },
    { key: 'price', label: 'Price (MUR)', type: 'number', required: true, placeholder: '0' },
    { key: 'duration', label: 'Duration (minutes)', type: 'number', placeholder: '30', defaultValue: 30 },
    { key: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
  ],
}

export default function ServicesPage() {
  return <ServiceCatalogManager config={config} />
}
