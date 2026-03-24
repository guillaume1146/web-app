'use client'

import ServiceCatalogManager from '@/components/shared/ServiceCatalogManager'
import { NURSE_SERVICE_CATEGORIES } from '@/lib/validations/service-catalog'
import type { ServiceCatalogConfig } from '@/components/shared/ServiceCatalogManager'

const config: ServiceCatalogConfig = {
 title: 'My Services',
 apiBasePath: '/api/services/my-services',
 createApiPath: '/api/services/custom',
 categoryOptions: NURSE_SERVICE_CATEGORIES,
 accentColor: 'pink',
 providerType: 'NURSE',
 workflowCreateHref: '/nurse/workflows/create',
 fields: [
 { key: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'e.g. Wound Dressing' },
 {
 key: 'category', label: 'Category', type: 'select', required: true,
 options: NURSE_SERVICE_CATEGORIES,
 },
 { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the service...' },
 { key: 'price', label: 'Price (MUR)', type: 'number', required: true, placeholder: '0' },
 { key: 'duration', label: 'Duration', type: 'text', required: true, placeholder: 'e.g. 30 minutes, 1 hour' },
 { key: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
 ],
}

export default function NurseServicesPage() {
 return <ServiceCatalogManager config={config} />
}
