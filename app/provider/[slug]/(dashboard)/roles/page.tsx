'use client'
import dynamic from 'next/dynamic'
const RolesPage = dynamic(() => import('@/app/regional/(dashboard)/roles/page'), { ssr: false })
export default function DynamicRolesPage() { return <RolesPage /> }
