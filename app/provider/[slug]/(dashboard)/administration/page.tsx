'use client'
import dynamic from 'next/dynamic'
const AdminPage = dynamic(() => import('@/app/regional/(dashboard)/administration/page'), { ssr: false })
export default function DynamicAdminPage() { return <AdminPage /> }
