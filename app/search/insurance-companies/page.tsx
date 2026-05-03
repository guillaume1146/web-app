import { redirect } from 'next/navigation'

// Redirect legacy URL to the unified company partners page
export default function LegacyInsurancePage() {
  redirect('/search/company?type=insurance')
}
