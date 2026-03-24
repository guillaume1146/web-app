'use client'

import ServiceCatalogManager from '@/components/shared/ServiceCatalogManager'
import { LAB_TEST_CATEGORIES } from '@/lib/validations/service-catalog'
import type { ServiceCatalogConfig } from '@/components/shared/ServiceCatalogManager'

const SAMPLE_TYPES = [
 { value: 'Blood', label: 'Blood' },
 { value: 'Urine', label: 'Urine' },
 { value: 'Saliva', label: 'Saliva' },
 { value: 'Stool', label: 'Stool' },
 { value: 'Tissue', label: 'Tissue' },
 { value: 'Swab', label: 'Swab' },
 { value: 'Other', label: 'Other' },
]

const config: ServiceCatalogConfig = {
 title: 'Test Catalog',
 apiBasePath: '/api/services/my-services',
 createApiPath: '/api/services/custom',
 categoryOptions: LAB_TEST_CATEGORIES,
 accentColor: 'cyan',
 providerType: 'LAB_TECHNICIAN',
 workflowCreateHref: '/lab-technician/workflows/create',
 fields: [
 { key: 'serviceName', label: 'Test Name', type: 'text', required: true, placeholder: 'e.g. Complete Blood Count (CBC)' },
 {
 key: 'category', label: 'Category', type: 'select', required: true,
 options: LAB_TEST_CATEGORIES,
 },
 { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the test...' },
 { key: 'price', label: 'Price (MUR)', type: 'number', required: true, placeholder: '0' },
 { key: 'sampleType', label: 'Sample Type', type: 'select', required: true, options: SAMPLE_TYPES },
 { key: 'turnaroundTime', label: 'Turnaround Time', type: 'text', required: true, placeholder: 'e.g. 24 hours, 3-5 days' },
 { key: 'preparation', label: 'Preparation Instructions', type: 'textarea', placeholder: 'e.g. Fasting required for 12 hours' },
 { key: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
 ],
}

export default function LabTechServicesPage() {
 return <ServiceCatalogManager config={config} />
}
