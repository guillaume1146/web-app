import Link from 'next/link'
import { FaFacebookF, FaLinkedinIn, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa'

const Footer: React.FC = () => (
  <footer role="contentinfo" className="bg-[#001E40] text-gray-400">
    {/* Thin teal accent line */}
    <div className="h-0.5 bg-[#0C6780]" />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* Main row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Brand + contact */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <span className="text-white font-bold text-lg tracking-tight">MediWyz</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1"><FaMapMarkerAlt className="text-[10px]" />Moka, Mauritius</span>
            <a href="tel:+23058176189" className="flex items-center gap-1 hover:text-white transition"><FaPhone className="text-[10px]" />+230 5817 6189</a>
            <span className="flex items-center gap-1"><FaEnvelope className="text-[10px]" />info@mediwyz.com</span>
          </div>
        </div>

        {/* Links + social */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <Link href="/search/company"   className="hover:text-white transition">Company Partners</Link>
          <Link href="/search/services"  className="hover:text-white transition">Services</Link>
          <Link href="/signup"           className="hover:text-white transition">Get Started</Link>
          <Link href="/privacy"          className="hover:text-white transition">Privacy</Link>
          <Link href="/terms"            className="hover:text-white transition">Terms</Link>
          <Link href="/medical-disclaimer" className="hover:text-white transition">Disclaimer</Link>

          {/* Social icons */}
          <div className="flex items-center gap-2 ml-1">
            <a href="https://www.facebook.com/profile.php?id=61579689551043"
              aria-label="Facebook"
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition text-[#9AE1FF]">
              <FaFacebookF className="text-[10px]" />
            </a>
            <a href="https://www.linkedin.com/company/mediwyz"
              aria-label="LinkedIn"
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition text-[#9AE1FF]">
              <FaLinkedinIn className="text-[10px]" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom copyright line */}
      <div className="border-t border-white/10 mt-4 pt-3 text-[11px] text-center text-gray-500">
        © {new Date().getFullYear()} MediWyz. All rights reserved. MediWyz connects users with licensed providers and does not provide medical care directly.
      </div>
    </div>
  </footer>
)

export default Footer
