import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'Find Doctors in Mauritius',
 description:
 'Search and book appointments with qualified doctors in Mauritius. Filter by specialty, location, availability, and consultation type. Video and in-person consultations available.',
 keywords: [
 'doctors Mauritius',
 'find doctor',
 'book appointment',
 'specialist',
 'cardiologist',
 'pediatrician',
 'dermatologist',
 'video consultation doctor',
 ],
 openGraph: {
 title: 'Find Doctors in Mauritius | MediWyz',
 description:
 'Search and book appointments with qualified doctors in Mauritius. Video and in-person consultations available.',
 },
}

export default function DoctorsSearchLayout({
 children,
}: {
 children: React.ReactNode
}) {
 return <>{children}</>
}
