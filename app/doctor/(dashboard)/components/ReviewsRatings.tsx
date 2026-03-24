'use client'

import React, { useState } from 'react'
import type { IconType } from 'react-icons'
import {
 FaStar,
 FaStarHalfAlt,
 FaComment,
 FaThumbsUp,
 FaReply,
 FaFilter,
 FaSearch,
 FaChartBar,
 FaChartLine,
 FaTrophy,
 FaAward,
 FaMedal,
 FaChevronDown,
 FaChevronUp,
 FaCalendarAlt,
 FaCheckCircle,
 FaHeart,
 FaShareAlt,
 FaEllipsisV,
 FaQuoteLeft,
 FaArrowUp,
 FaSmile,
 FaMeh,
 FaFrown,
 FaUserMd,
 FaClock
} from 'react-icons/fa'

/* ---------------- Types ---------------- */

interface PatientComment {
 id: string
 patientFirstName: string
 patientLastName: string
 patientProfileImage: string
 comment: string
 starRating: number
 date: string
 time: string
 helpful?: number
 response?: string
 verified?: boolean
}

interface PerformanceMetrics {
 patientSatisfaction?: number
 responseTime?: number
 appointmentCompletionRate?: number
 returnPatientRate?: number
}

interface DoctorData {
 patientComments?: PatientComment[]
 rating?: number
 reviews?: number
 performanceMetrics?: PerformanceMetrics
 [key: string]: unknown
}

interface Props {
 doctorData: DoctorData
}

interface FilterOptions {
 rating: 'all' | '5' | '4' | '3' | '2' | '1'
 dateRange: 'all' | 'week' | 'month' | 'year'
 verified: 'all' | 'verified' | 'unverified'
}

/* ---------------- Component ---------------- */

const ReviewsRatings: React.FC<Props> = ({ doctorData }) => {
 const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'analytics' | 'achievements'>('overview')
 const [searchQuery, setSearchQuery] = useState('')
 const [filters, setFilters] = useState<FilterOptions>({
 rating: 'all',
 dateRange: 'all',
 verified: 'all'
 })
 const [showFilters, setShowFilters] = useState(false)
 const [expandedReview, setExpandedReview] = useState<string | null>(null)
 const [replyingTo, setReplyingTo] = useState<string | null>(null)
 const [replyText, setReplyText] = useState('')

 // Safe data extraction
 const reviews: PatientComment[] = doctorData?.patientComments ?? []
 const rating: number = doctorData?.rating ?? 0
 const totalReviews: number = doctorData?.reviews ?? 0
 const performanceMetrics: Required<PerformanceMetrics> = {
 patientSatisfaction: doctorData?.performanceMetrics?.patientSatisfaction ?? 0,
 responseTime: doctorData?.performanceMetrics?.responseTime ?? 0,
 appointmentCompletionRate: doctorData?.performanceMetrics?.appointmentCompletionRate ?? 0,
 returnPatientRate: doctorData?.performanceMetrics?.returnPatientRate ?? 0
 }

 // Rating distribution
 const getRatingDistribution = () => {
 const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
 reviews.forEach((review: PatientComment) => {
 if (review.starRating >= 1 && review.starRating <= 5) {
 distribution[review.starRating as 1 | 2 | 3 | 4 | 5]++
 }
 })
 return distribution
 }

 const ratingDistribution = getRatingDistribution()

 const sections: {
 id: 'overview' | 'reviews' | 'analytics' | 'achievements'
 label: string
 icon: IconType
 color: 'blue' | 'green' | 'purple' | 'yellow'
 count?: number
 }[] = [
 { id: 'overview', label: 'Overview', icon: FaChartBar, color: 'blue' },
 { id: 'reviews', label: 'Patient Reviews', icon: FaComment, color: 'green', count: totalReviews },
 { id: 'analytics', label: 'Analytics', icon: FaChartLine, color: 'purple' },
 { id: 'achievements', label: 'Achievements', icon: FaTrophy, color: 'yellow' }
 ]

 const filterReviews = (reviewList: PatientComment[]) => {
 const q = searchQuery.toLowerCase()
 return reviewList.filter((review) => {
 const matchesSearch =
 review.comment?.toLowerCase().includes(q) ||
 review.patientFirstName?.toLowerCase().includes(q) ||
 review.patientLastName?.toLowerCase().includes(q)

 const matchesRating = filters.rating === 'all' || review.starRating.toString() === filters.rating
 const matchesVerified =
 filters.verified === 'all' || (filters.verified === 'verified' ? !!review.verified : !review.verified)

 // dateRange filter UI exists but not implemented; add if needed.
 return matchesSearch && matchesRating && matchesVerified
 })
 }

 const renderStars = (score: number, size = 'text-base') => {
 const nodes: React.ReactNode[] = []
 const full = Math.floor(score)
 const half = score % 1 !== 0

 for (let i = 0; i < full; i++) nodes.push(<FaStar key={`s${i}`} className={`${size} text-yellow-500`} />)
 if (half) nodes.push(<FaStarHalfAlt key="half" className={`${size} text-yellow-500`} />)
 for (let i = nodes.length; i < 5; i++) nodes.push(<FaStar key={`e${i}`} className={`${size} text-gray-300`} />)
 return nodes
 }

 const getSentimentIcon = (score: number) => {
 if (score >= 4) return <FaSmile className="text-green-500 text-2xl" />
 if (score >= 3) return <FaMeh className="text-yellow-500 text-2xl" />
 return <FaFrown className="text-red-500 text-2xl" />
 }

 const renderOverview = () => (
 <div className="space-y-4 sm:space-y-6">
 {/* Overall Rating Card */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
 <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
 <div className="text-center">
 <div className="text-4xl sm:text-5xl font-bold text-blue-700 mb-2">{rating}</div>
 <div className="flex justify-center mb-2">{renderStars(rating, 'text-xl')}</div>
 <p className="text-sm text-gray-600">{totalReviews} reviews</p>
 </div>

 <div className="flex-1 w-full">
 <h3 className="text-sm font-semibold text-gray-800 mb-3">Rating Distribution</h3>
 {[5, 4, 3, 2, 1].map((star) => {
 const count = ratingDistribution[star as 1 | 2 | 3 | 4 | 5]
 const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0
 return (
 <div key={star} className="flex items-center gap-2 mb-2">
 <span className="text-sm w-3">{star}</span>
 <FaStar className="text-yellow-500 text-sm" />
 <div className="flex-1 bg-gray-200 rounded-full h-2">
 <div
 className="bg-sky-100 h-2 rounded-full"
 style={{ width: `${pct}%` }}
 />
 </div>
 <span className="text-xs text-gray-600 w-10 text-right">{count}</span>
 </div>
 )
 })}
 </div>
 </div>
 </div>

 {/* Performance Metrics */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-200">
 <div className="flex items-center gap-2 mb-1">
 <FaSmile className="text-green-600" />
 <p className="text-xs text-gray-600">Satisfaction</p>
 </div>
 <p className="text-lg sm:text-xl font-bold text-green-700">{performanceMetrics.patientSatisfaction}%</p>
 </div>

 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-200">
 <div className="flex items-center gap-2 mb-1">
 <FaClock className="text-purple-600" />
 <p className="text-xs text-gray-600">Response Time</p>
 </div>
 <p className="text-lg sm:text-xl font-bold text-purple-700">{performanceMetrics.responseTime} min</p>
 </div>

 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-orange-200">
 <div className="flex items-center gap-2 mb-1">
 <FaCheckCircle className="text-orange-600" />
 <p className="text-xs text-gray-600">Completion Rate</p>
 </div>
 <p className="text-lg sm:text-xl font-bold text-orange-700">
 {performanceMetrics.appointmentCompletionRate}%
 </p>
 </div>

 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-cyan-200">
 <div className="flex items-center gap-2 mb-1">
 <FaReply className="text-cyan-600" />
 <p className="text-xs text-gray-600">Return Rate</p>
 </div>
 <p className="text-lg sm:text-xl font-bold text-cyan-700">{performanceMetrics.returnPatientRate}%</p>
 </div>
 </div>

 {/* Recent Reviews Preview */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Recent Reviews</h3>
 <div className="space-y-3">
 {reviews.slice(0, 2).map((review: PatientComment) => (
 <div key={review.id} className="bg-white/80 rounded-lg p-3 sm:p-4 border border-gray-200">
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 bg-brand-teal rounded-full flex items-center justify-center text-white font-bold text-sm">
 {review.patientFirstName[0]}
 {review.patientLastName[0]}
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between mb-1">
 <h4 className="font-semibold text-sm">
 {review.patientFirstName} {review.patientLastName}
 </h4>
 <span className="text-xs text-gray-500">{review.date}</span>
 </div>
 <div className="flex mb-2">{renderStars(review.starRating, 'text-sm')}</div>
 <p className="text-sm text-gray-700 line-clamp-2">{review.comment}</p>
 </div>
 </div>
 </div>
 ))}
 {reviews.length > 2 && (
 <button onClick={() => setActiveTab('reviews')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
 View all {totalReviews} reviews →
 </button>
 )}
 </div>
 </div>
 </div>
 )

 const renderReviewCard = (review: PatientComment) => (
 <div
 key={review.id}
 className="bg-white/30 rounded-lg sm:rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
 >
 <div className="p-4 sm:p-5">
 <div className="flex items-start gap-3 sm:gap-4">
 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-teal rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
 {review.patientFirstName[0]}
 {review.patientLastName[0]}
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-2">
 <div>
 <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
 {review.patientFirstName} {review.patientLastName}
 {review.verified && <FaCheckCircle className="inline ml-1 text-blue-500 text-xs" />}
 </h4>
 <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
 <FaCalendarAlt className="text-gray-400" />
 {review.date} at {review.time}
 </div>
 </div>
 <div className="text-right">
 <div className="flex mb-1">{renderStars(review.starRating, 'text-sm')}</div>
 <span className="text-xs text-gray-500">{review.starRating}/5</span>
 </div>
 </div>

 <p className={`text-sm text-gray-700 mb-3 ${expandedReview === review.id ? '' : 'line-clamp-3'}`}>
 <FaQuoteLeft className="inline mr-1 text-gray-400 text-xs" />
 {review.comment}
 </p>

 {review.comment.length > 150 && (
 <button
 onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
 className="text-blue-600 hover:text-blue-700 text-xs font-medium mb-3"
 >
 {expandedReview === review.id ? 'Show less' : 'Read more'}
 </button>
 )}

 {/* Response Section */}
 {review.response && (
 <div className="bg-white rounded-lg p-3 mb-3 border border-blue-200">
 <div className="flex items-center gap-2 mb-2">
 <FaUserMd className="text-blue-600" />
 <span className="text-xs font-semibold text-blue-800">Doctor&apos;s Response</span>
 </div>
 <p className="text-xs sm:text-sm text-gray-700">{review.response}</p>
 </div>
 )}

 {/* Reply Section */}
 {replyingTo === review.id && (
 <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
 <textarea
 value={replyText}
 onChange={(e) => setReplyText(e.target.value)}
 placeholder="Write your response..."
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
 rows={3}
 />
 <div className="flex gap-2 mt-2">
 <button className="px-3 py-1.5 bg-white transition">
 Send Reply
 </button>
 <button
 onClick={() => {
 setReplyingTo(null)
 setReplyText('')
 }}
 className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 transition"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <button className="flex items-center gap-1 text-gray-600 hover:text-green-600 transition text-xs">
 <FaThumbsUp />
 <span>Helpful ({review.helpful || 0})</span>
 </button>
 {!review.response && (
 <button
 onClick={() => setReplyingTo(review.id)}
 className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition text-xs"
 >
 <FaReply />
 Reply
 </button>
 )}
 <button className="flex items-center gap-1 text-gray-600 hover:text-purple-600 transition text-xs">
 <FaShareAlt />
 Share
 </button>
 </div>
 <button className="text-gray-400 hover:text-gray-600 transition">
 <FaEllipsisV className="text-sm" />
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 )

 const renderAnalytics = () => {
 // Compute rating trends from actual reviews data
 const now = new Date()
 const thisMonthReviews = reviews.filter((r) => {
 const d = new Date(r.date)
 return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
 })
 const lastMonthReviews = reviews.filter((r) => {
 const d = new Date(r.date)
 const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
 const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
 return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
 })

 const avgRating = (list: PatientComment[]) =>
 list.length > 0
 ? parseFloat((list.reduce((s, r) => s + r.starRating, 0) / list.length).toFixed(1))
 : null

 const thisMonthAvg = avgRating(thisMonthReviews)
 const lastMonthAvg = avgRating(lastMonthReviews)
 const ratingDiff =
 thisMonthAvg !== null && lastMonthAvg !== null
 ? (thisMonthAvg - lastMonthAvg).toFixed(1)
 : null

 // Compute response rate from reviews that have a doctor response
 const respondedCount = reviews.filter((r) => !!r.response).length
 const responseRatePct =
 reviews.length > 0 ? Math.round((respondedCount / reviews.length) * 100) : null

 // Compute sentiment from star ratings
 const positiveCount = reviews.filter((r) => r.starRating >= 4).length
 const neutralCount = reviews.filter((r) => r.starRating === 3).length
 const negativeCount = reviews.filter((r) => r.starRating <= 2).length
 const sentimentTotal = reviews.length
 const positivePct = sentimentTotal > 0 ? Math.round((positiveCount / sentimentTotal) * 100) : null
 const neutralPct = sentimentTotal > 0 ? Math.round((neutralCount / sentimentTotal) * 100) : null
 const negativePct = sentimentTotal > 0 ? Math.round((negativeCount / sentimentTotal) * 100) : null

 return (
 <div className="space-y-4 sm:space-y-6">
 {/* Trends */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Rating Trends</h3>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs text-gray-600 mb-1">This Month</p>
 <div className="flex items-center gap-2">
 <span className="text-2xl font-bold text-purple-700">
 {thisMonthAvg !== null ? thisMonthAvg : 'N/A'}
 </span>
 {ratingDiff !== null && (
 <div className={`flex items-center ${parseFloat(ratingDiff) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 <FaArrowUp className="text-xs" />
 <span className="text-xs">{Math.abs(parseFloat(ratingDiff))}</span>
 </div>
 )}
 </div>
 </div>
 <div>
 <p className="text-xs text-gray-600 mb-1">Last Month</p>
 <div className="flex items-center gap-2">
 <span className="text-2xl font-bold text-gray-700">
 {lastMonthAvg !== null ? lastMonthAvg : 'N/A'}
 </span>
 </div>
 </div>
 </div>

 <div className="mt-4 pt-4 border-t border-purple-200">
 <div className="flex items-center justify-between text-sm">
 <span className="text-gray-600">Average Response Time</span>
 <span className="font-semibold">
 {performanceMetrics.responseTime > 0 ? `${performanceMetrics.responseTime} minutes` : 'N/A'}
 </span>
 </div>
 <div className="flex items-center justify-between text-sm mt-2">
 <span className="text-gray-600">Response Rate</span>
 <span className="font-semibold">
 {responseRatePct !== null ? `${responseRatePct}%` : 'N/A'}
 </span>
 </div>
 </div>
 </div>

 {/* Sentiment Analysis — computed from real ratings */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Patient Sentiment</h3>

 {sentimentTotal === 0 ? (
 <p className="text-sm text-gray-500">No reviews available to compute sentiment.</p>
 ) : (
 <div className="grid grid-cols-3 gap-4 text-center">
 <div>
 <FaSmile className="text-green-500 text-3xl mx-auto mb-2" />
 <p className="text-2xl font-bold text-green-700">{positivePct}%</p>
 <p className="text-xs text-gray-600">Positive (4-5 stars)</p>
 </div>
 <div>
 <FaMeh className="text-yellow-500 text-3xl mx-auto mb-2" />
 <p className="text-2xl font-bold text-yellow-700">{neutralPct}%</p>
 <p className="text-xs text-gray-600">Neutral (3 stars)</p>
 </div>
 <div>
 <FaFrown className="text-red-500 text-3xl mx-auto mb-2" />
 <p className="text-2xl font-bold text-red-700">{negativePct}%</p>
 <p className="text-xs text-gray-600">Negative (1-2 stars)</p>
 </div>
 </div>
 )}
 </div>

 {/* Review Categories — coming soon notice since keyword analysis requires NLP */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-orange-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Common Feedback Themes</h3>
 <p className="text-sm text-gray-500">Feedback theme analysis coming soon.</p>
 </div>
 </div>
 )
 }

 const renderAchievements = () => {
 // Compute badge eligibility from real data
 const hasTopRated = rating >= 4.5
 const hasPatientChoice = totalReviews >= 100
 const hasQuickResponder = performanceMetrics.responseTime > 0 && performanceMetrics.responseTime < 15
 const hasExcellence = performanceMetrics.patientSatisfaction >= 95

 const badges: { icon: React.ComponentType<{ className?: string }>; name: string; description: string; color: string; earned: boolean }[] = [
 { icon: FaTrophy, name: 'Top Rated', description: '4.5+ rating', color: 'yellow', earned: hasTopRated },
 { icon: FaAward, name: 'Patient Choice', description: '100+ reviews', color: 'blue', earned: hasPatientChoice },
 { icon: FaMedal, name: 'Quick Responder', description: '<15 min response', color: 'green', earned: hasQuickResponder },
 { icon: FaStar, name: 'Excellence', description: '95% satisfaction', color: 'purple', earned: hasExcellence }
 ]

 // Milestones computed from real metrics
 const fiveStarCount = reviews.filter((r) => r.starRating === 5).length
 const milestones = [
 {
 label: '100 Reviews',
 achieved: totalReviews >= 100,
 current: totalReviews,
 target: 100
 },
 {
 label: '500 Reviews',
 achieved: totalReviews >= 500,
 current: totalReviews,
 target: 500
 },
 {
 label: '50 Five-Star Reviews',
 achieved: fiveStarCount >= 50,
 current: fiveStarCount,
 target: 50
 },
 {
 label: '4.5+ Overall Rating',
 achieved: rating >= 4.5,
 current: null,
 target: null
 }
 ]

 return (
 <div className="space-y-4 sm:space-y-6">
 {/* Badges */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-yellow-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Earned Badges</h3>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 {badges.map((badge, index) => (
 <div key={index} className={`text-center ${badge.earned ? '' : 'opacity-40 grayscale'}`}>
 <div className={`w-16 h-16 from-${badge.color}-400 to-${badge.color}-600 rounded-full flex items-center justify-center mx-auto mb-2`}>
 <badge.icon className="text-white text-2xl" />
 </div>
 <p className="text-sm font-semibold text-gray-800">{badge.name}</p>
 <p className="text-xs text-gray-600">{badge.description}</p>
 {!badge.earned && <p className="text-xs text-gray-400 mt-1">Not yet earned</p>}
 </div>
 ))}
 </div>
 </div>

 {/* Milestones */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Milestones</h3>

 <div className="space-y-3">
 {milestones.map((item, index) => (
 <div key={index} className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-blue-200">
 <div className="flex items-center gap-3">
 {item.achieved ? (
 <FaCheckCircle className="text-green-500 text-xl" />
 ) : (
 <div className="w-5 h-5 border-2 border-gray-400 rounded-full flex-shrink-0" />
 )}
 <div>
 <p className={`text-sm font-medium ${item.achieved ? 'text-gray-800' : 'text-gray-600'}`}>
 {item.label}
 </p>
 {!item.achieved && item.current !== null && item.target !== null && (
 <p className="text-xs text-gray-500">{item.current} / {item.target}</p>
 )}
 {item.achieved && (
 <p className="text-xs text-green-600">Achieved</p>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )
 }

 return (
 <div className="space-y-4 sm:space-y-5 md:space-y-6">
 {/* Header */}
 <div className="bg-brand-navy rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-white">
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
 <div>
 <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 flex items-center">
 <FaStar className="mr-2 sm:mr-3" />
 Reviews & Ratings
 </h2>
 <p className="opacity-90 text-xs sm:text-sm md:text-base">Patient feedback and performance metrics</p>
 </div>
 <div className="flex items-center gap-4">
 <div className="text-center">
 <p className="text-3xl font-bold">{rating}</p>
 <div className="flex">{renderStars(rating, 'text-sm')}</div>
 <p className="text-xs opacity-90">{totalReviews} reviews</p>
 </div>
 {getSentimentIcon(rating)}
 </div>
 </div>
 </div>

 {/* Search and Filters */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg border border-gray-200">
 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
 <div className="flex-1 relative">
 <FaSearch className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
 <input
 type="text"
 placeholder="Search reviews..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition text-sm sm:text-base"
 />
 </div>

 <button
 onClick={() => setShowFilters(!showFilters)}
 className="px-4 sm:px-6 py-2.5 sm:py-3 bg-sky-50 text-gray-700 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-2 text-sm sm:text-base"
 >
 <FaFilter />
 <span className="hidden sm:inline">Filters</span>
 {showFilters ? <FaChevronUp /> : <FaChevronDown />}
 </button>
 </div>

 {showFilters && (
 <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-3 md:gap-4">
 <select
 value={filters.rating}
 onChange={(e) => setFilters({ ...filters, rating: e.target.value as FilterOptions['rating'] })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 text-sm sm:text-base"
 >
 <option value="all">All Ratings</option>
 <option value="5">5 Stars</option>
 <option value="4">4 Stars</option>
 <option value="3">3 Stars</option>
 <option value="2">2 Stars</option>
 <option value="1">1 Star</option>
 </select>

 <select
 value={filters.dateRange}
 onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as FilterOptions['dateRange'] })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 text-sm sm:text-base"
 >
 <option value="all">All Time</option>
 <option value="week">This Week</option>
 <option value="month">This Month</option>
 <option value="year">This Year</option>
 </select>

 <select
 value={filters.verified}
 onChange={(e) => setFilters({ ...filters, verified: e.target.value as FilterOptions['verified'] })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500 text-sm sm:text-base"
 >
 <option value="all">All Reviews</option>
 <option value="verified">Verified Only</option>
 <option value="unverified">Unverified</option>
 </select>
 </div>
 )}
 </div>

 {/* Mobile Accordion / Desktop Tabs */}
 <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
 {/* Desktop Tab Navigation */}
 <div className="hidden sm:block border-b border-gray-200">
 <div className="flex overflow-x-auto">
 {sections.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as typeof activeTab)}
 className={`flex-shrink-0 px-3 md:px-6 py-3 md:py-4 text-center font-medium transition-all flex items-center gap-1.5 md:gap-2 ${
 activeTab === tab.id
 ? `text-${tab.color}-600 border-b-2 border-current from-${tab.color}-50 to-transparent`
 : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
 }`}
 title={tab.label}
 >
 <tab.icon className="text-base md:text-base" />
 <span className="hidden md:inline whitespace-nowrap text-sm md:text-base">{tab.label}</span>
 {tab.count !== undefined && tab.count > 0 && (
 <span className="bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
 )}
 </button>
 ))}
 </div>
 </div>

 {/* Content */}
 <div className="p-4 md:p-6 pb-20 sm:pb-0">
 {activeTab === 'overview' && renderOverview()}
 {activeTab === 'reviews' && (
 <div className="space-y-3 sm:space-y-4">
 {filterReviews(reviews).map(renderReviewCard)}
 {filterReviews(reviews).length === 0 && (
 <div className="text-center py-8">
 <FaComment className="text-gray-400 text-4xl mx-auto mb-3" />
 <p className="text-gray-500">No reviews found</p>
 </div>
 )}
 </div>
 )}
 {activeTab === 'analytics' && renderAnalytics()}
 {activeTab === 'achievements' && renderAchievements()}
 </div>
 </div>

 {/* Mobile Bottom Tab Bar */}
 <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-1 z-50 shadow-lg">
 {sections.map((section) => {
 const Icon = section.icon
 const isActive = activeTab === section.id
 return (
 <button key={section.id} onClick={() => setActiveTab(section.id as typeof activeTab)}
 className={`flex flex-col items-center justify-center p-1 min-w-[40px] ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
 <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
 {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-1" />}
 </button>
 )
 })}
 </div>
 </div>
 )
}

export default ReviewsRatings
