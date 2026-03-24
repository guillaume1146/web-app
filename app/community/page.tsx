'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaGlobe } from 'react-icons/fa'
import { PostFeed } from '@/components/posts'

export default function CommunityPage() {
 const [userId, setUserId] = useState<string | undefined>()
 const [userType, setUserType] = useState<string | undefined>()

 useEffect(() => {
 // Get current user from localStorage if available
 const storedUserId = localStorage.getItem('mediwyz_user_id')
 const storedUserType = localStorage.getItem('mediwyz_userType')
 if (storedUserId) setUserId(storedUserId)
 if (storedUserType) setUserType(storedUserType)
 }, [])

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header */}
 <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
 <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
 <div className="flex items-center gap-3">
 <Link
 href="/"
 className="text-gray-500 hover:text-gray-700 transition-colors"
 >
 <FaArrowLeft />
 </Link>
 <div className="flex items-center gap-2">
 <FaGlobe className="text-emerald-600 text-xl" />
 <div>
 <h1 className="text-lg sm:text-xl font-bold text-gray-900">
 Community Health Feed
 </h1>
 <p className="text-xs sm:text-sm text-gray-500">
 Health tips, articles, and knowledge shared by verified doctors
 </p>
 </div>
 </div>
 </div>
 </div>
 </header>

 {/* Main content */}
 <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
 <PostFeed
 currentUserId={userId}
 currentUserType={userType}
 showCreateButton={true}
 />
 </main>
 </div>
 )
}
