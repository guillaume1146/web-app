import SearchDashboardWrapper from '@/components/search/SearchDashboardWrapper'

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <SearchDashboardWrapper>{children}</SearchDashboardWrapper>
}
