import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'Create Account',
 description:
 'Join MediWyz - Create your healthcare account to book appointments with doctors, nurses, and healthcare providers in Mauritius. Patients, doctors, and healthcare professionals welcome.',
 robots: {
 index: false,
 follow: true,
 },
}

export default function SignupLayout({
 children,
}: {
 children: React.ReactNode
}) {
 return <>{children}</>
}
