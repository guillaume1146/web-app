// components/layout/Footer.tsx
// Updated: 
// - Updated the short disclaimer section at the bottom to use the provided short version text.
// - Kept the existing links to /privacy, /terms, /medical-disclaimer (full disclaimer will be on /medical-disclaimer page).
// - Made the short disclaimer more prominent and linked to full pages.
import Link from 'next/link'
import Image from 'next/image'
import { FaFacebookF, FaLinkedinIn, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa'

interface FooterLink {
 href: string
 label: string
}

interface SocialLink {
 href: string
 icon: React.ReactNode
 label: string
}

const Footer: React.FC = () => {
 const quickLinks: FooterLink[] = [
 { href: '/search/doctors', label: 'Find Doctors' },
 { href: '/search/medicines', label: 'Buy Medicines' },
 { href: '/signup', label: 'Get Started' },
 { href: '/login', label: 'Sign In' },
 ]

 const ourServices: FooterLink[] = [
 { href: '/search/doctors', label: 'Online Consultation' },
 { href: '/search/medicines', label: 'Medicine Delivery' },
 { href: '/search/doctors', label: 'Find Specialists' },
 ]

 const aboutLinks: FooterLink[] = [
 { href: '/privacy', label: 'Privacy Policy' },
 { href: '/terms', label: 'Terms of Service' },
 { href: '/medical-disclaimer', label: 'Medical Disclaimer' },
 ]

 const socialLinks: SocialLink[] = [
 { href: 'https://www.facebook.com/profile.php?id=61579689551043', icon: <FaFacebookF />, label: 'Facebook' },
 { href: 'https://www.linkedin.com/company/mediwyz', icon: <FaLinkedinIn />, label: 'LinkedIn' },
 ]

 return (
 <footer role="contentinfo" className="text-gray-200"
 style={{
 background: '#001E40'
 }}
 >
 {/* Gradient accent line at top */}
 <div className="h-1 bg-brand-teal " />
 {/* Footer Content — reduced vertical padding to prioritise the
     marketplace above; visitors should reach the footer quickly. */}
 <div className="py-5">
 <div className="container mx-auto px-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Company Info */}
 <div>
 <div className="flex items-center space-x-3 mb-4">
 <Image src="/images/logo-icon.png" alt="MediWyz" width={40} height={40} className="brightness-0 invert" />
 <span className="text-2xl font-bold text-white">MediWyz</span>
 </div>
 <p className="text-gray-300 mb-6 leading-relaxed">
 Your trusted digital health platform connecting patients with qualified doctors and providing 
 AI-powered health insights for better wellness in Mauritius.
 </p>
 <div className="flex items-center space-x-2 text-gray-400 mb-2">
 <FaMapMarkerAlt />
 <span>Moka, Mauritius</span>
 </div>
 <div className="flex items-center space-x-2 text-gray-400 mb-2">
 <FaPhone />
 <a href="tel:+23058176189" className="hover:text-white transition">+230 5817 6189</a>
 </div>
 <div className="flex items-center space-x-2 text-gray-400">
 <FaEnvelope />
 <span>info@mediwyz.com</span>
 </div>
 </div>

 {/* Quick Links */}
 <div>
 <h5 className="text-lg font-semibold mb-4 text-white">Quick Links</h5>
 <ul className="space-y-2">
 {quickLinks.map((link) => (
 <li key={link.href}>
 <Link href={link.href} className="text-gray-400 hover:text-brand-sky transition">
 {link.label}
 </Link>
 </li>
 ))}
 </ul>
 </div>

 {/* Our Services */}
 <div>
 <h5 className="text-lg font-semibold mb-4 text-white">Our Services</h5>
 <ul className="space-y-2">
 {ourServices.map((service) => (
 <li key={service.label}>
 <Link href={service.href} className="text-gray-400 hover:text-brand-sky transition">
 {service.label}
 </Link>
 </li>
 ))}
 </ul>
 </div>

 {/* About */}
 <div>
 <h5 className="text-lg font-semibold mb-4 text-white">About</h5>
 <ul className="space-y-2">
 {aboutLinks.map((link) => (
 <li key={link.label}>
 <Link href={link.href} className="text-gray-400 hover:text-brand-sky transition">
 {link.label}
 </Link>
 </li>
 ))}
 </ul>
 </div>
 </div>

 {/* Social Links and Follow */}
 <div className="border-t border-gray-700 mt-4 pt-4">
 <div className="flex flex-col md:flex-row justify-between items-center">
 <div className="mb-4 md:mb-0">
 <p className="text-gray-400 mb-2">Follow us:</p>
 <div className="flex space-x-4">
 {socialLinks.map((social) => (
 <a
 key={social.label}
 href={social.href}
 className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-brand-sky hover:bg-white/20 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
 aria-label={social.label}
 >
 {social.icon}
 </a>
 ))}
 </div>
 </div>

 </div>
 </div>

 {/* Copyright - All in one line */}
 <div className="border-t border-gray-700 mt-4 pt-4 text-center">
 <div className="flex flex-wrap justify-center items-center gap-1 text-gray-400 text-sm">
 <span>© 2025 MediWyz. All rights reserved.</span>
 <span className="hidden md:inline mx-2">|</span>
 <Link href="/privacy" className="text-brand-sky hover:text-white transition">
 Privacy Policy
 </Link>
 <span className="hidden md:inline mx-2">|</span>
 <Link href="/terms" className="text-brand-sky hover:text-white transition">
 Terms of Service
 </Link>
 <span className="hidden md:inline mx-2">|</span>
 <Link href="/medical-disclaimer" className="text-brand-sky hover:text-white transition">
 Medical Disclaimer
 </Link>
 </div>
 </div>

 {/* Updated Medical Disclaimer (Short Version) */}
 <div className="mt-8 p-4 bg-white/10 border border-white/20 rounded-lg">
 <p className="text-sm text-gray-300">
 <strong>Disclaimer:</strong> MediWyz is a platform that connects users with licensed healthcare providers. MediWyz does not provide medical care. Consultations, prescriptions, and tests are the sole responsibility of your chosen provider. By using this platform, you acknowledge and agree to our <Link href="/terms" className="underline text-yellow-300 hover:text-yellow-200">Terms of Service</Link> and <Link href="/privacy" className="underline text-yellow-300 hover:text-yellow-200">Privacy Policy</Link>. For full details, see our <Link href="/medical-disclaimer" className="underline text-yellow-300 hover:text-yellow-200">Medical Disclaimer</Link>.
 </p>
 </div>
 </div>
 </div>
 </footer>
 )
}

export default Footer