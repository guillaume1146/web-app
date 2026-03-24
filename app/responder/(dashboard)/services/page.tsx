'use client'

import ServiceCatalogManager from '@/components/shared/ServiceCatalogManager'
import type { ServiceCatalogConfig } from '@/components/shared/ServiceCatalogManager'

const CATEGORIES = [
  { value: 'Ambulance', label: 'Ambulance' },
  { value: 'First Aid', label: 'First Aid' },
  { value: 'Medical Transport', label: 'Medical Transport' },
  { value: 'Event Coverage', label: 'Event Coverage' },
  { value: 'Other', label: 'Other' },
]

const config: ServiceCatalogConfig = {
  title: 'My Services',
  apiBasePath: '/api/services/my-services',
  createApiPath: '/api/services/custom',
  categoryOptions: CATEGORIES,
  providerType: 'EMERGENCY_WORKER',
  workflowCreateHref: '/responder/workflows/create',
  accentColor: 'red',
  fields: [
    { key: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'e.g. Ambulance Response' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: CATEGORIES },
    { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the service...' },
    { key: 'price', label: 'Price (MUR)', type: 'number', required: true, placeholder: '0' },
    { key: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
  ],
}

export default function ResponderServicesPage() {
  return <ServiceCatalogManager config={config} />
}
