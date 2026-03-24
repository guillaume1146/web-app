import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'Pharmacy & Medicines',
 description:
 'Search and order authentic medicines online in Mauritius. Fast delivery from licensed pharmacies. Prescription and over-the-counter medicines available.',
 keywords: [
 'pharmacy Mauritius',
 'buy medicine online',
 'prescription medicine',
 'OTC medicine',
 'medicine delivery',
 'online pharmacy Mauritius',
 ],
 openGraph: {
 title: 'Pharmacy & Medicines | MediWyz',
 description:
 'Order authentic medicines online in Mauritius. Fast delivery from licensed pharmacies.',
 },
}

export default function MedicinesSearchLayout({
 children,
}: {
 children: React.ReactNode
}) {
 return <>{children}</>
}
