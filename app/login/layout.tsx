import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: 'Sign In',
 description:
 'Sign in to your MediWyz account to access your dashboard, manage appointments, and connect with healthcare providers in Mauritius.',
 robots: {
 index: false,
 follow: true,
 },
}

export default function LoginLayout({
 children,
}: {
 children: React.ReactNode
}) {
 return <>{children}</>
}
