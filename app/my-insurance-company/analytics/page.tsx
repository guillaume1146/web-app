'use client'

// Re-export the existing analytics UI under the capability-gated route.
// Any user with insurance-capability can reach it here; the legacy
// `/insurance/(dashboard)/analytics` still exists for seeded INSURANCE_REP
// users until we retire that whole folder.
import InsuranceAnalyticsPage from '../../insurance/(dashboard)/analytics/page'

export default function Page() {
  return <InsuranceAnalyticsPage />
}
