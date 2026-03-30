'use client'

import dynamic from 'next/dynamic'

const MyHealthSidebar = dynamic(() => import('@/components/shared/MyHealthSidebar'), { ssr: false })

export default function MyHealthPage() {
  return <MyHealthSidebar />
}
