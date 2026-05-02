'use client'

import { useParams } from 'next/navigation'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import ServiceCatalogManager from '@/components/shared/ServiceCatalogManager'
import type { ServiceCatalogConfig } from '@/components/shared/ServiceCatalogManager'

const CATEGORIES = [
  { value: 'Consultation', label: 'Consultation' },
  { value: 'Treatment', label: 'Treatment' },
  { value: 'Assessment', label: 'Assessment' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Other', label: 'Other' },
]

export default function DynamicServicesPage() {
  const params = useParams()
  const slug = params.slug as string
  const user = useDashboardUser()

  const config: ServiceCatalogConfig = {
    title: 'My Services',
    apiBasePath: '/api/services/my-services',
    createApiPath: '/api/services/custom',
    categoryOptions: CATEGORIES,
    providerType: user?.userType?.toUpperCase(),
    workflowCreateHref: `/provider/${slug}/workflows/create`,
    fields: [
      { key: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'e.g. Initial Consultation' },
      { key: 'category', label: 'Category', type: 'select', required: true, options: CATEGORIES },
      { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the service...' },
      { key: 'price', label: 'Price (MUR)', type: 'number', required: true, placeholder: '0' },
      { key: 'duration', label: 'Duration (minutes)', type: 'number', placeholder: '30', defaultValue: 30 },
      { key: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
  }

  return <ServiceCatalogManager config={config} />
}
