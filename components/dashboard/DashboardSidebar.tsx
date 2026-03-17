'use client'

import Link from 'next/link'
import { FaTimes } from 'react-icons/fa'
import { useTranslation } from '@/lib/i18n'

export interface SidebarItem {
  id: string
  label: string
  labelKey?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  count?: number
  href: string
  divider?: boolean
}

interface DashboardSidebarProps {
  items: SidebarItem[]
  activeItemId: string
  isOpen: boolean
  isMobile: boolean
  onClose: () => void
  footer?: React.ReactNode
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  items,
  activeItemId,
  isOpen,
  isMobile,
  onClose,
  footer,
}) => {
  const { t } = useTranslation()

  const getLabel = (item: SidebarItem): string => {
    if (item.labelKey) {
      const translated = t(item.labelKey)
      if (translated !== item.labelKey) return translated
    }
    return item.label
  }

  const isCollapsedDesktop = !isOpen && !isMobile

  const renderNavItems = (closeSidebar?: boolean) => (
    <nav className="space-y-1.5 md:space-y-2" aria-label="Dashboard menu">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeItemId === item.id
        const label = getLabel(item)

        if (item.divider) {
          if (isCollapsedDesktop) {
            return <div key={item.id} className="my-2 border-t border-gray-200" />
          }
          return (
            <div key={item.id} className="pt-4 pb-1">
              <p className="px-3 md:px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {label}
              </p>
            </div>
          )
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            title={isCollapsedDesktop ? label : undefined}
            onClick={closeSidebar ? onClose : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`block w-full text-left rounded-lg md:rounded-xl transition-all transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isCollapsedDesktop
                ? 'px-0 py-2.5 flex items-center justify-center'
                : 'px-4 md:px-4 lg:px-5 py-3.5 md:py-3.5'
            } ${
              isActive
                ? `${item.bgColor} ${item.color} shadow-md`
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <div className={`flex items-center ${isCollapsedDesktop ? 'justify-center' : 'gap-3 md:gap-3.5'}`}>
              <Icon className="text-lg md:text-xl lg:text-2xl flex-shrink-0" aria-hidden="true" />
              {!isCollapsedDesktop && (
                <>
                  <span className="font-medium text-base md:text-base lg:text-lg">
                    {label}
                  </span>
                  {item.count != null && item.count > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full" aria-label={`${item.count} notifications`}>
                      {item.count}
                    </span>
                  )}
                </>
              )}
              {isCollapsedDesktop && item.count != null && item.count > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-label={`${item.count} notifications`} />
              )}
            </div>
          </Link>
        )
      })}
    </nav>
  )

  // Mobile: fixed overlay sidebar
  if (isMobile) {
    return (
      <aside
        role="navigation"
        aria-label="Dashboard sidebar navigation"
        className={`
          fixed inset-y-0 left-0 z-[60]
          ${isOpen ? 'w-[85%] sm:w-72' : 'w-0'}
          bg-white shadow-2xl
          transform transition-all duration-150 ease-out
          overflow-hidden
        `}
      >
        {/* Close button */}
        <div className="flex items-center justify-end px-3 sm:px-4 pt-4 pb-2">
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close sidebar"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        <div className="h-full overflow-y-auto scrollbar-hidden p-3 sm:p-4">
          {renderNavItems(true)}

          {footer && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t">
              {footer}
            </div>
          )}
        </div>
      </aside>
    )
  }

  // Desktop: in-flow sidebar (not fixed — part of flex layout)
  return (
    <aside
      role="navigation"
      aria-label="Dashboard sidebar navigation"
      className={`
        flex-shrink-0
        ${isOpen ? 'w-64 lg:w-72 xl:w-80' : 'w-16'}
        bg-white
        transition-all duration-300 ease-in-out
        overflow-hidden
        m-3 sm:m-4 md:m-5 lg:m-6 xl:m-8 rounded-2xl border border-gray-200 shadow-sm
      `}
    >
      <div className={`h-full overflow-y-auto scrollbar-hidden ${isCollapsedDesktop ? 'p-2' : 'p-3 md:p-5 lg:p-6'}`}>
        {renderNavItems()}

        {footer && !isCollapsedDesktop && (
          <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t">
            {footer}
          </div>
        )}
      </div>
    </aside>
  )
}

export default DashboardSidebar
