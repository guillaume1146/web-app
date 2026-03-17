'use client'

import { Suspense } from 'react'
import LoginForm from '@/components/forms/LoginForm'

export default function LoginPage() {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4 overflow-hidden">
      <Suspense fallback={<div className="animate-pulse bg-white rounded-2xl w-full max-w-md h-96" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
