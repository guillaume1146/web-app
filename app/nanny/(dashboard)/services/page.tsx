'use client'

import ServiceCatalogManager from '@/components/shared/ServiceCatalogManager'
import { NANNY_SERVICE_CATEGORIES } from '@/lib/validations/service-catalog'
import type { ServiceCatalogConfig } from '@/components/shared/ServiceCatalogManager'

const config: ServiceCatalogConfig = {
 title: 'My Services',
 apiBasePath: '/api/services/my-services',
 createApiPath: '/api/services/custom',
 categoryOptions: NANNY_SERVICE_CATEGORIES,
 accentColor: 'purple',
 providerType: 'NANNY',
 workflowCreateHref: '/nanny/workflows/create',
 fields: [
 { key: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'e.g. Early Learning Program' },
 {
 key: 'category', label: 'Category', type: 'select', required: true,
 options: NANNY_SERVICE_CATEGORIES,
 },
 { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the service...' },
 { key: 'price', label: 'Price (MUR)', type: 'number', required: true, placeholder: '0' },
 { key: 'ageRange', label: 'Age Range', type: 'text', placeholder: 'e.g. 0-2 years, 3-6 years, All ages' },
 { key: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
 ],
}

export default function NannyServicesPage() {
 return <ServiceCatalogManager config={config} />
}
