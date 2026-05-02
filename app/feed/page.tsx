'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FaHeart, FaComment, FaCheckCircle, FaSignInAlt, FaUserPlus,
  FaShoppingBag, FaUserMd, FaSearch, FaFire, FaArrowRight,
} from 'react-icons/fa'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string
  content: string
  category: string | null
  imageUrl: string | null
  likeCount: number
  createdAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    profileImage: string | null
    userType: string
    verified: boolean
  }
  company?: { id: string; companyName: string } | null
  _count: { comments: number }
}

interface ProviderRole {
  code: string
  label: string
  slug: string
  icon: string
}

interface ShopItem {
  id: string
  name: string
  price: number
  imageUrl: string | null
  provider: { firstName: string; lastName: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getInitials(first: string, last: string): string {
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase()
}

const CATEGORY_LABELS: Record<string, string> = {
  health_tips: 'Health Tips', article: 'Article', news: 'News',
  wellness: 'Wellness', case_study: 'Case Study',
}

const CATEGORY_TABS = [
  { value: '', label: 'All' },
  { value: 'health_tips', label: 'Health Tips' },
  { value: 'article', label: 'Articles' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'news', label: 'News' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }) {
  const authorName = post.company
    ? post.company.companyName
    : `${post.author.firstName} ${post.author.lastName}`

  return (
    <article className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-all overflow-hidden">
      {post.imageUrl && (
        <div className="h-40 overflow-hidden">
          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        {/* Author */}
        <div className="flex items-center gap-2.5 mb-3">
          {post.author.profileImage ? (
            <img src={post.author.profileImage} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#0C6780]/10 text-[#0C6780] flex items-center justify-center text-xs font-bold flex-shrink-0">
              {getInitials(post.author.firstName, post.author.lastName)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-gray-900 truncate">{authorName}</span>
              {post.author.verified && <FaCheckCircle className="text-blue-500 text-[10px] flex-shrink-0" />}
            </div>
            <p className="text-[10px] text-gray-400">{getRelativeTime(post.createdAt)}</p>
          </div>
          {post.category && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
              {CATEGORY_LABELS[post.category] || post.category}
            </span>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 line-clamp-3 mb-3">{post.content}</p>

        {/* Engagement */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <FaHeart className="text-red-400" /> {post.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <FaComment /> {post._count.comments}
          </span>
          <span className="ml-auto text-[#0C6780] font-medium cursor-default">Read more →</span>
        </div>
      </div>
    </article>
  )
}

function ProviderSidebar({ roles }: { roles: ProviderRole[] }) {
  return (
    <aside className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <FaUserMd className="text-[#0C6780] text-sm" />
        <h2 className="text-sm font-bold text-gray-900">Find a Provider</h2>
      </div>
      <div className="p-3 flex flex-col gap-1">
        {roles.slice(0, 8).map(role => (
          <Link
            key={role.code}
            href={`/search/results?category=${role.slug}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#0C6780]/5 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0C6780]/10 flex items-center justify-center text-sm flex-shrink-0">
              🩺
            </div>
            <span className="text-sm text-gray-700 group-hover:text-[#0C6780] font-medium truncate">
              {role.label}
            </span>
            <FaArrowRight className="text-[10px] text-gray-300 group-hover:text-[#0C6780] ml-auto flex-shrink-0" />
          </Link>
        ))}
      </div>
      <div className="p-3 border-t border-gray-100">
        <Link
          href="/search/results?category=providers"
          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-[#0C6780] text-white text-sm font-semibold rounded-xl hover:bg-[#001E40] transition-colors"
        >
          <FaSearch className="text-xs" /> Browse All Providers
        </Link>
      </div>
    </aside>
  )
}

function HealthShopSidebar({ items }: { items: ShopItem[] }) {
  return (
    <aside className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <FaShoppingBag className="text-emerald-600 text-sm" />
        <h2 className="text-sm font-bold text-gray-900">Health Shop</h2>
      </div>

      {items.length > 0 ? (
        <div className="p-3 flex flex-col gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-lg flex-shrink-0">
                  💊
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-[10px] text-gray-500 truncate">
                  by {item.provider.firstName} {item.provider.lastName}
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 flex-shrink-0">
                Rs {item.price.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center">
          <div className="text-3xl mb-2">🛒</div>
          <p className="text-sm text-gray-500">Medicines, supplements & health products from verified providers</p>
        </div>
      )}

      <div className="p-3 border-t border-gray-100">
        <Link
          href="/search/health-shop"
          className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <FaShoppingBag className="text-xs" /> Shop Now
        </Link>
      </div>
    </aside>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublicFeedPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [roles, setRoles] = useState<ProviderRole[]>([])
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  // Prevent flash of public content before auth check completes
  const [authChecked, setAuthChecked] = useState(false)

  // Detect auth — redirect to private dashboard if logged in
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mediwyz_user')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.id) {
          // Compute destination directly — never use /patient/feed (middleware strips it back to /feed)
          const DEDICATED: Record<string, string> = {
            insurance:          '/insurance/feed',
            corporate:          '/corporate/feed',
            'referral-partner': '/referral-partner/feed',
            'regional-admin':   '/regional/feed',
            admin:              '/admin/feed',
          }
          const SLUGS: Record<string, string> = {
            patient: 'patients', doctor: 'doctors', nurse: 'nurses',
            'child-care-nurse': 'childcare', pharmacy: 'pharmacists',
            lab: 'lab-technicians', ambulance: 'emergency',
            caregiver: 'caregivers', physiotherapist: 'physiotherapists',
            dentist: 'dentists', optometrist: 'optometrists', nutritionist: 'nutritionists',
          }
          const dest = DEDICATED[parsed.userType] ??
            `/provider/${SLUGS[parsed.userType] ?? 'patients'}/feed`
          router.replace(dest)
          return // don't set authChecked — we're leaving
        }
      }
    } catch {
      // guest
    }
    setIsAuthenticated(false)
    setAuthChecked(true)
  }, [router])

  // Load sidebar data once
  useEffect(() => {
    fetch('/api/roles?searchEnabled=true')
      .then(r => r.json())
      .then(json => { if (json.success) setRoles(json.data) })
      .catch(() => {})

    fetch('/api/search/health-shop?limit=5')
      .then(r => r.json())
      .then(json => { if (json.success && json.data?.items) setShopItems(json.data.items) })
      .catch(() => {})
  }, [])

  const fetchPosts = useCallback(async (pageNum: number, category: string, append = false) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)

      const params = new URLSearchParams({ page: String(pageNum), limit: '10', sortBy: 'reactions' })
      if (category) params.set('category', category)

      const res = await fetch(`/api/posts?${params}`)
      const json = await res.json()
      if (json.success) {
        const newPosts: Post[] = json.data.posts || []
        setPosts(prev => append ? [...prev, ...newPosts] : newPosts)
        setHasMore(pageNum < (json.data.totalPages || 1))
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchPosts(1, activeCategory)
  }, [activeCategory, fetchPosts])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchPosts(next, activeCategory, true)
  }

  // Show spinner while checking auth (avoids flash of guest UI before redirect)
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#0C6780] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public top bar */}
      <div className="bg-[#001E40] text-white py-3 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FaFire className="text-orange-400 text-base flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight">Community Health Feed</h1>
              <p className="text-[10px] sm:text-xs text-white/65 truncate">
                Most reacted posts from the MediWyz community — no account needed to browse
              </p>
            </div>
          </div>
          {!isAuthenticated && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
              >
                <FaSignInAlt /> Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-[#001E40] rounded-lg hover:bg-white/90 transition-colors"
              >
                <FaUserPlus /> Join free
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Guest banner */}
      {!isAuthenticated && (
        <div className="bg-[#9AE1FF]/20 border-b border-[#9AE1FF]/40 py-2 px-4 sm:px-6 lg:px-10">
          <p className="max-w-7xl mx-auto text-xs sm:text-sm text-[#001E40]">
            <span className="font-semibold">You&apos;re browsing as a guest.</span>{' '}
            <Link href="/signup" className="underline font-medium hover:text-[#0C6780]">
              Create a free account
            </Link>{' '}
            to like, comment, and share health tips with the community.
          </p>
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Provider promotions */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-4 space-y-4">
              <ProviderSidebar roles={roles} />

              {/* Book a consultation card */}
              <div className="bg-gradient-to-br from-[#001E40] to-[#0C6780] rounded-2xl p-4 text-white">
                <p className="text-xs font-semibold opacity-80 mb-1">Ready to get care?</p>
                <p className="text-sm font-bold mb-3">Find and book a health provider in minutes</p>
                <Link
                  href="/search/results?category=providers"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-[#001E40] px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors"
                >
                  Book now <FaArrowRight className="text-[10px]" />
                </Link>
              </div>
            </div>
          </div>

          {/* CENTER: Feed */}
          <div className="lg:col-span-6">
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
              {CATEGORY_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveCategory(tab.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeCategory === tab.value
                      ? 'bg-[#0C6780] text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-[#0C6780] hover:text-[#0C6780]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Posts */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
                    <div className="flex gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/5" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm">No posts yet in this category.</p>
                <button
                  onClick={() => setActiveCategory('')}
                  className="mt-3 text-sm text-[#0C6780] underline"
                >
                  View all posts
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map(post => <PostCard key={post.id} post={post} />)}

                {hasMore && (
                  <div className="text-center pt-2">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-6 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-700 rounded-xl hover:border-[#0C6780] hover:text-[#0C6780] transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? 'Loading…' : 'Load more posts'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Health Shop promotions */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-4 space-y-4">
              <HealthShopSidebar items={shopItems} />

              {/* Join CTA */}
              {!isAuthenticated && (
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
                  <p className="text-xs font-semibold opacity-80 mb-1">Join MediWyz for free</p>
                  <p className="text-sm font-bold mb-3">Like, comment & get personalised health tips</p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors"
                  >
                    <FaUserPlus /> Sign up free
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Mobile sidebars (stacked below feed) */}
        <div className="mt-6 grid sm:grid-cols-2 gap-4 lg:hidden">
          <ProviderSidebar roles={roles} />
          <HealthShopSidebar items={shopItems} />
        </div>
      </div>
    </div>
  )
}
