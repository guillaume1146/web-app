'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaPenFancy, FaEdit, FaTrash, FaCheckCircle, FaSpinner } from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import CreatePostForm from '@/components/posts/CreatePostForm'

interface Post {
 id: string
 content: string
 category: string | null
 tags: string[]
 likeCount: number
 createdAt: string
 updatedAt: string
 author: {
 id: string
 firstName: string
 lastName: string
 profileImage: string | null
 userType: string
 verified: boolean
 doctorProfile?: { specialty: string[]; clinicAffiliation: string } | null
 }
 _count: { comments: number }
}

const categoryLabels: Record<string, string> = {
 health_tips: 'Health Tips',
 article: 'Article',
 news: 'News',
 case_study: 'Case Study',
 wellness: 'Wellness',
}

const categoryColors: Record<string, string> = {
 health_tips: 'bg-green-100 text-green-700',
 article: 'bg-blue-100 text-blue-700',
 news: 'bg-orange-100 text-orange-700',
 case_study: 'bg-purple-100 text-purple-700',
 wellness: 'bg-pink-100 text-pink-700',
}

function getRelativeTime(dateString: string): string {
 const now = new Date()
 const date = new Date(dateString)
 const diffMs = now.getTime() - date.getTime()
 const diffSeconds = Math.floor(diffMs / 1000)
 const diffMinutes = Math.floor(diffSeconds / 60)
 const diffHours = Math.floor(diffMinutes / 60)
 const diffDays = Math.floor(diffHours / 24)
 const diffWeeks = Math.floor(diffDays / 7)

 if (diffSeconds < 60) return 'just now'
 if (diffMinutes < 60) return `${diffMinutes}m ago`
 if (diffHours < 24) return `${diffHours}h ago`
 if (diffDays < 7) return `${diffDays}d ago`
 if (diffWeeks < 4) return `${diffWeeks}w ago`
 return date.toLocaleDateString()
}

export default function DoctorPostsPage() {
 const [posts, setPosts] = useState<Post[]>([])
 const [loading, setLoading] = useState(true)
 const { user: hookUser } = useUser()
 const currentUserId = hookUser?.id ?? null
 const [deletingId, setDeletingId] = useState<string | null>(null)
 const [editingId, setEditingId] = useState<string | null>(null)
 const [editContent, setEditContent] = useState<string>('')
 const [savingId, setSavingId] = useState<string | null>(null)

 const fetchPosts = useCallback(async () => {
 try {
 setLoading(true)
 const res = await fetch('/api/posts?page=1&limit=50')
 const json = await res.json()
 if (json.success) {
 setPosts(json.data.posts)
 }
 } catch (error) {
 console.error('Failed to fetch posts:', error)
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => {
 fetchPosts()
 }, [fetchPosts])

 const handlePostCreated = (post: Record<string, unknown>) => {
 const newPost = { ...post, _count: { comments: 0 } } as unknown as Post
 setPosts((prev) => [newPost, ...prev])
 }

 const handleDelete = async (postId: string) => {
 if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
 return
 }

 setDeletingId(postId)
 try {
 const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
 const json = await res.json()
 if (json.success) {
 setPosts((prev) => prev.filter((p) => p.id !== postId))
 }
 } catch (error) {
 console.error('Failed to delete post:', error)
 } finally {
 setDeletingId(null)
 }
 }

 const handleEdit = (post: Post) => {
 setEditingId(post.id)
 setEditContent(post.content)
 }

 const handleCancelEdit = () => {
 setEditingId(null)
 setEditContent('')
 }

 const handleSaveEdit = async (postId: string) => {
 if (!editContent.trim()) return
 setSavingId(postId)
 try {
 const res = await fetch(`/api/posts/${postId}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ content: editContent.trim() }),
 })
 const json = await res.json()
 if (json.success) {
 setPosts(prev =>
 prev.map(p =>
 p.id === postId
 ? { ...p, content: editContent.trim(), updatedAt: new Date().toISOString() }
 : p
 )
 )
 setEditingId(null)
 setEditContent('')
 }
 } catch (error) {
 console.error('Failed to save post edit:', error)
 } finally {
 setSavingId(null)
 }
 }

 // Filter posts to only show the current doctor's posts
 const myPosts = currentUserId
 ? posts.filter((p) => p.author.id === currentUserId)
 : []

 return (
 <div className="space-y-6">
 {/* Page header */}
 <div>
 <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
 <FaPenFancy className="text-teal-600" />
 My Posts
 </h1>
 <p className="text-gray-500 text-sm mt-1">
 Create and manage your community posts
 </p>
 </div>

 {/* Create post form */}
 <CreatePostForm onPostCreated={handlePostCreated} />

 {/* My posts list */}
 <div>
 <h2 className="text-lg font-semibold text-gray-900 mb-4">
 Published Posts ({myPosts.length})
 </h2>

 {loading ? (
 <div className="space-y-4">
 {[1, 2, 3].map((i) => (
 <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse">
 <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
 <div className="h-3 bg-gray-200 rounded w-full mb-2" />
 <div className="h-3 bg-gray-200 rounded w-3/4" />
 </div>
 ))}
 </div>
 ) : myPosts.length === 0 ? (
 <div className="bg-white rounded-xl shadow p-12 text-center">
 <FaPenFancy className="text-4xl text-gray-300 mx-auto mb-3" />
 <h3 className="text-lg font-semibold text-gray-500">No posts yet</h3>
 <p className="text-gray-400 text-sm mt-1">
 Use the form above to create your first post and share your knowledge.
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 {myPosts.map((post) => (
 <div
 key={post.id}
 className="bg-white rounded-xl shadow p-4 sm:p-6 hover:shadow-lg transition-shadow"
 >
 {editingId === post.id ? (
 /* Inline edit mode */
 <div className="space-y-3">
 <textarea
 value={editContent}
 onChange={e => setEditContent(e.target.value)}
 rows={5}
 className="w-full border border-blue-300 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
 placeholder="Edit your post..."
 />
 <div className="flex items-center gap-2 justify-end">
 <button
 onClick={handleCancelEdit}
 className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={() => handleSaveEdit(post.id)}
 disabled={savingId === post.id || !editContent.trim()}
 className="px-4 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
 >
 {savingId === post.id ? (
 <><FaSpinner className="animate-spin text-xs" /> Saving…</>
 ) : (
 'Save Changes'
 )}
 </button>
 </div>
 </div>
 ) : (
 <>
 {/* Post content */}
 <div className="flex items-start justify-between gap-3">
 <div className="flex-1 min-w-0">
 <p className="text-gray-800 text-sm sm:text-base whitespace-pre-wrap leading-relaxed line-clamp-3">
 {post.content}
 </p>
 </div>

 {/* Action buttons */}
 <div className="flex items-center gap-2 flex-shrink-0">
 <button
 onClick={() => handleEdit(post)}
 className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
 title="Edit post"
 >
 <FaEdit />
 </button>
 <button
 onClick={() => handleDelete(post.id)}
 disabled={deletingId === post.id}
 className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
 title="Delete post"
 >
 {deletingId === post.id ? (
 <FaSpinner className="animate-spin" />
 ) : (
 <FaTrash />
 )}
 </button>
 </div>
 </div>

 {/* Meta row */}
 <div className="flex flex-wrap items-center gap-2 mt-3">
 {post.category && (
 <span
 className={`text-xs font-medium rounded-full px-3 py-1 ${
 categoryColors[post.category] || 'bg-gray-100 text-gray-700'
 }`}
 >
 {categoryLabels[post.category] || post.category}
 </span>
 )}
 {post.tags.map((tag, index) => (
 <span
 key={index}
 className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5"
 >
 #{tag}
 </span>
 ))}
 </div>

 {/* Stats row */}
 <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
 <span className="flex items-center gap-1">
 <FaCheckCircle className="text-xs text-green-500" />
 {post.likeCount} likes
 </span>
 <span>{post._count.comments} comments</span>
 <span className="ml-auto text-xs text-gray-400">
 {getRelativeTime(post.createdAt)}
 </span>
 </div>
 </>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )
}
