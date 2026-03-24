import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'Find Nurses in Mauritius',
 description:
 'Search and book qualified nurses in Mauritius for elderly care, post-surgery care, home visits, and more. Licensed and verified nursing professionals.',
 keywords: [
 'nurses Mauritius',
 'find nurse',
 'home nurse',
 'elderly care',
 'post-surgery care',
 'nursing services',
 'home visit nurse',
 ],
 openGraph: {
 title: 'Find Nurses in Mauritius | MediWyz',
 description:
 'Search and book qualified nurses in Mauritius. Home visits, elderly care, and video consultations available.',
 },
}

export default function NursesSearchLayout({
 children,
}: {
 children: React.ReactNode
}) {
 return <>{children}</>
}
