import { PrismaClient } from '@prisma/client'

export async function seedCmsContent(prisma: PrismaClient) {
  // ─── 1. CMS Sections (7 records) ───────────────────────────────────────────────

  const cmsSections = [
    {
      id: 'CMS-HERO',
      sectionType: 'hero',
      title: 'Hero Section',
      sortOrder: 0,
      isVisible: true,
      content: {
        mainTitle: "Your Health, Our Priority",
        highlightWord: "Health",
        subtitle: "Connect with qualified doctors, get AI-powered health insights, and access medicines across Mauritius. Your trusted healthcare companion.",
        platformBadge: "Mauritius's Leading Digital Health Platform",
        searchPlaceholder: "Search doctors, diseases...",
        ctaButtons: [
          { icon: "👨‍⚕️", label: "Find Doctors", shortLabel: "Doctors" },
          { icon: "💊", label: "Buy Medicines", shortLabel: "Medicines" },
          { icon: "🤖", label: "AI Health Assistant", shortLabel: "AI Health" },
        ],
      },
    },
    {
      id: 'CMS-STATS',
      sectionType: 'stats',
      title: 'Statistics Section',
      sortOrder: 1,
      isVisible: true,
      content: {
        items: [
          { number: "500+", label: "Qualified Doctors", color: "text-blue-500" },
          { number: "10,000+", label: "Happy Patients", color: "text-green-500" },
          { number: "25,000+", label: "Consultations", color: "text-purple-500" },
          { number: "20+", label: "Cities Covered", color: "text-orange-500" },
        ],
      },
    },
    {
      id: 'CMS-SERVICES',
      sectionType: 'services',
      title: 'Services Section',
      sortOrder: 2,
      isVisible: true,
      content: {
        sectionTitle: "Comprehensive Healthcare Services",
        sectionSubtitle: "From online consultations to medicine delivery, we provide end-to-end healthcare solutions tailored for the Mauritian community.",
        items: [
          { id: 1, title: "Video Consultation", description: "Consult with qualified doctors from the comfort of your home", icon: "FaVideo", gradient: "bg-gradient-blue" },
          { id: 2, title: "Easy Appointment Booking", description: "Book appointments with your preferred doctors instantly", icon: "FaCalendarCheck", gradient: "bg-gradient-green" },
          { id: 3, title: "Medicine Delivery", description: "Get medicines delivered to your doorstep across Mauritius", icon: "FaTruck", gradient: "bg-gradient-purple" },
          { id: 4, title: "AI Health Assistant", description: "Get instant health information and treatment suggestions", icon: "FaRobot", gradient: "bg-gradient-orange" },
        ],
      },
    },
    {
      id: 'CMS-DETAILED',
      sectionType: 'detailed_services',
      title: 'Detailed Services Section',
      sortOrder: 3,
      isVisible: true,
      content: {
        sectionTitle: "Our Healthcare Ecosystem",
        sectionSubtitle: "Comprehensive healthcare solutions designed to meet all your health needs",
        items: [
          { emoji: "🩺", title: "MediWyz", subtitle: "Simple, accessible, and efficient healthcare", description: "MediWyz's telehealth app simplifies healthcare. Users can consult locally-licensed doctors and allied health professionals, receive medications, schedule health screenings or vaccinations, shop for health and wellness products, and connect with a trusted network of healthcare providers and specialists." },
          { emoji: "🏥", title: "MediWyz CLINICS", subtitle: "Comprehensive primary healthcare services", description: "MediWyz is a network of GP clinics across Mauritius, providing comprehensive primary care services including GP consultations, chronic disease management, health screenings, vaccinations, and more." },
          { emoji: "🛒", title: "MediWyz Online Marketplace", subtitle: "Convenient access to health products", description: "MediWyz's online Marketplace is accessible via our website and mobile app, offering preventive health services such as vaccinations and health screenings, along with over-the-counter medication. With free delivery across Mauritius." },
          { emoji: "🏥", title: "MedSuites", subtitle: "Centralised Health Screening and Imaging Services", description: "A premier medical centre located in Central Mauritius, MedSuites centralises health screening and imaging services for comprehensive care and convenience in a single location." },
        ],
        ctaTitle: "Experience the Future of Healthcare",
        ctaDescription: "Join thousands of Mauritians who trust MediWyz for their comprehensive healthcare needs.",
        ctaPrimaryButton: "Get Started Today",
        ctaSecondaryButton: "Explore Services",
      },
    },
    {
      id: 'CMS-SPECIALTIES',
      sectionType: 'specialties',
      title: 'Specialties Section',
      sortOrder: 4,
      isVisible: true,
      content: {
        sectionTitle: "Medical Specialties",
        sectionSubtitle: "Find doctors across various specialties and get expert care",
        items: [
          { id: 1, name: "General Medicine", icon: "FaStethoscope", color: "text-blue-500" },
          { id: 2, name: "Cardiology", icon: "FaHeart", color: "text-red-500" },
          { id: 3, name: "Dermatology", icon: "FaBrain", color: "text-cyan-500" },
          { id: 4, name: "Pediatrics", icon: "FaBaby", color: "text-yellow-500" },
          { id: 5, name: "Gynecology", icon: "FaFemale", color: "text-pink-500" },
          { id: 6, name: "Orthopedics", icon: "FaBone", color: "text-green-500" },
          { id: 7, name: "Psychiatry", icon: "FaBrain", color: "text-purple-500" },
          { id: 8, name: "Ayurveda", icon: "FaLeaf", color: "text-green-600" },
          { id: 9, name: "Diabetes Care", icon: "FaHeartbeat", color: "text-red-600" },
          { id: 10, name: "Hypertension", icon: "FaStethoscope", color: "text-blue-600" },
          { id: 11, name: "Obesity Management", icon: "FaWeight", color: "text-orange-500" },
          { id: 12, name: "Mental Health", icon: "FaBrain", color: "text-indigo-500" },
        ],
      },
    },
    {
      id: 'CMS-WHYCHOOSE',
      sectionType: 'why_choose',
      title: 'Why Choose Us Section',
      sortOrder: 5,
      isVisible: true,
      content: {
        sectionTitle: "Why Choose MediWyz?",
        sectionSubtitle: "Trusted by thousands of Mauritians for quality healthcare",
        items: [
          { icon: "FaShieldAlt", title: "Verified Doctors", description: "All doctors are verified and licensed healthcare professionals" },
          { icon: "FaClock", title: "24/7 Support", description: "Round-the-clock customer support for all your healthcare needs" },
          { icon: "FaAward", title: "Quality Care", description: "Committed to providing the highest quality healthcare services" },
        ],
      },
    },
    {
      id: 'CMS-CTA',
      sectionType: 'cta_banner',
      title: 'CTA Banner',
      sortOrder: 6,
      isVisible: true,
      content: {
        title: "Ready to Take Control of Your Health?",
        description: "Join thousands of Mauritians who trust MediWyz for their healthcare needs. Start your journey to better health today.",
        primaryButton: "Schedule Consultation",
        secondaryButton: "Learn More",
      },
    },
  ]
  await prisma.cmsSection.createMany({ data: cmsSections, skipDuplicates: true })

  // ─── 2. CMS Hero Slides (8 records) ────────────────────────────────────────────

  const cmsHeroSlides = [
    { id: 'SLIDE-01', title: 'Medical Specialists',       subtitle: 'Specialist Medical Doctor',                                                                              imageUrl: '/images/hero/gemini-doctor-3-removebg-1.png', sortOrder: 0, isActive: true },
    { id: 'SLIDE-02', title: 'Medicine Store',             subtitle: 'Browse and purchase medicines with doctor\'s prescription. Fast delivery across Mauritius.',               imageUrl: '/images/hero/medicine-1.png',                  sortOrder: 1, isActive: true },
    { id: 'SLIDE-03', title: 'Expert Medical Care',        subtitle: 'Professional Doctor Consultation',                                                                        imageUrl: '/images/hero/doctor-1.png',                    sortOrder: 2, isActive: true },
    { id: 'SLIDE-04', title: 'Emergency Services',         subtitle: 'Emergency Ambulance Service',                                                                             imageUrl: '/images/hero/ambulance-1.png',                 sortOrder: 3, isActive: true },
    { id: 'SLIDE-05', title: 'Insurance Protection',       subtitle: 'Health Insurance Coverage',                                                                               imageUrl: '/images/hero/insurance-1.png',                 sortOrder: 4, isActive: true },
    { id: 'SLIDE-06', title: 'Nursing Excellence',         subtitle: 'Professional Nurse Care',                                                                                 imageUrl: '/images/hero/nurse-1.png',                     sortOrder: 5, isActive: true },
    { id: 'SLIDE-07', title: 'Healthcare Professionals',   subtitle: 'Experienced Medical Doctor',                                                                              imageUrl: '/images/hero/doctor-2.png',                    sortOrder: 6, isActive: true },
    { id: 'SLIDE-08', title: 'Patient-Centered Care',      subtitle: 'Patient Care Services',                                                                                   imageUrl: '/images/hero/patient-1.png',                   sortOrder: 7, isActive: true },
  ]
  await prisma.cmsHeroSlide.createMany({ data: cmsHeroSlides, skipDuplicates: true })

  // ─── 3. CMS Testimonials (2 records) ───────────────────────────────────────────

  const cmsTestimonials = [
    { id: 'TEST-01', name: 'John Smith',    role: 'Patient',       content: 'Excellent service and caring staff!',        rating: 5, imageUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=John', isActive: true },
    { id: 'TEST-02', name: 'Mary Johnson',  role: 'Family Member', content: 'The home care service was exceptional.',      rating: 5, imageUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Mary', isActive: true },
  ]
  await prisma.cmsTestimonial.createMany({ data: cmsTestimonials, skipDuplicates: true })

  // ─── 4. Madagascar (MG) Country-Specific CMS Content ─────────────────────────

  const mgSections = [
    {
      id: 'CMS-MG-HERO',
      sectionType: 'hero',
      title: 'Hero Section - Madagascar',
      sortOrder: 0,
      isVisible: true,
      countryCode: 'MG',
      content: {
        mainTitle: "Fahasalamanao, Laharam-pahamehana",
        highlightWord: "Fahasalamanao",
        subtitle: "Mifandraisa amin'ny dokotera voamarina, mahazo torohevitra ara-pahasalamana amin'ny AI, ary midira amin'ny fanafody manerana an'i Madagasikara. Namana azo itokisana eo amin'ny fitsaboana.",
        platformBadge: "Sehatrana Fitsaboana Voalohany ao Madagasikara",
        searchPlaceholder: "Hitady dokotera, aretina...",
        ctaButtons: [
          { icon: "👨‍⚕️", label: "Hitady Dokotera", shortLabel: "Dokotera" },
          { icon: "💊", label: "Mividy Fanafody", shortLabel: "Fanafody" },
          { icon: "🤖", label: "AI Mpanampy", shortLabel: "AI" },
        ],
      },
    },
    {
      id: 'CMS-MG-STATS',
      sectionType: 'stats',
      title: 'Statistics Section - Madagascar',
      sortOrder: 1,
      isVisible: true,
      countryCode: 'MG',
      content: {
        items: [
          { number: "200+", label: "Dokotera Voamarina", color: "text-blue-500" },
          { number: "5,000+", label: "Marary Faly", color: "text-green-500" },
          { number: "10,000+", label: "Fitsaboana", color: "text-purple-500" },
          { number: "15+", label: "Tanàna Voarakitra", color: "text-orange-500" },
        ],
      },
    },
    {
      id: 'CMS-MG-SERVICES',
      sectionType: 'services',
      title: 'Services Section - Madagascar',
      sortOrder: 2,
      isVisible: true,
      countryCode: 'MG',
      content: {
        sectionTitle: "Serivisy Fitsaboana Feno",
        sectionSubtitle: "Manomboka amin'ny fitsaboana an-tserasera ka hatramin'ny fanaterana fanafody, manome vahaolana fitsaboana feno ho an'ny Malagasy.",
        items: [
          { id: 1, title: "Fitsaboana Video", description: "Mifampiresaka amin'ny dokotera avy ao an-trano", icon: "FaVideo", gradient: "bg-gradient-blue" },
          { id: 2, title: "Fisoratana Andro", description: "Manoratra fotoana amin'ny dokotera tianao avy hatrany", icon: "FaCalendarCheck", gradient: "bg-gradient-green" },
          { id: 3, title: "Fanaterana Fanafody", description: "Mandray fanafody hatreny an-trano manerana an'i Madagasikara", icon: "FaTruck", gradient: "bg-gradient-purple" },
          { id: 4, title: "AI Mpanampy", description: "Mahazo vaovao ara-pahasalamana sy soso-kevitra fitsaboana", icon: "FaRobot", gradient: "bg-gradient-orange" },
        ],
      },
    },
    {
      id: 'CMS-MG-CTA',
      sectionType: 'cta_banner',
      title: 'CTA Banner - Madagascar',
      sortOrder: 6,
      isVisible: true,
      countryCode: 'MG',
      content: {
        title: "Vonona Hikarakara ny Fahasalamanao?",
        description: "Miaraha amin'ireo Malagasy an'arivony izay matoky an'i MediWyz ho an'ny filàny ara-pahasalamana. Atombohy ny dianao mankany amin'ny fahasalamana tsaratsara kokoa androany.",
        primaryButton: "Manoratra Fitsaboana",
        secondaryButton: "Fantaro Bebe Kokoa",
      },
    },
  ]
  await prisma.cmsSection.createMany({ data: mgSections, skipDuplicates: true })

  const mgHeroSlides = [
    { id: 'SLIDE-MG-01', title: 'Dokotera Spesialista',        subtitle: 'Dokotera Spesialista ao Madagasikara',    imageUrl: '/images/hero/gemini-doctor-3-removebg-1.png', sortOrder: 0, isActive: true, countryCode: 'MG' },
    { id: 'SLIDE-MG-02', title: 'Fivarotana Fanafody',          subtitle: 'Mividiana fanafody amin\'ny toromarika. Fanaterana haingana manerana an\'i Madagasikara.', imageUrl: '/images/hero/medicine-1.png', sortOrder: 1, isActive: true, countryCode: 'MG' },
    { id: 'SLIDE-MG-03', title: 'Fitsaboana Maika',             subtitle: 'Serivisy Ambulance Maika',                imageUrl: '/images/hero/ambulance-1.png', sortOrder: 2, isActive: true, countryCode: 'MG' },
  ]
  await prisma.cmsHeroSlide.createMany({ data: mgHeroSlides, skipDuplicates: true })

  const mgTestimonials = [
    { id: 'TEST-MG-01', name: 'Ravo Andrianarisoa', role: 'Marary',  content: 'Serivisy tsara sy mpiasa miahy! Tena nanampy ahy ny fitsaboana an-tserasera.', rating: 5, imageUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ravo', isActive: true, countryCode: 'MG' },
    { id: 'TEST-MG-02', name: 'Fanja Rakotomalala', role: 'Mpianakaviana', content: 'Nahafaly ahy ny serivisy fanaterana fanafody. Haingana sy azo itokisana.', rating: 5, imageUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Fanja', isActive: true, countryCode: 'MG' },
  ]
  await prisma.cmsTestimonial.createMany({ data: mgTestimonials, skipDuplicates: true })

  console.log(`  Seeded ${cmsSections.length} global + ${mgSections.length} MG CMS sections, ${cmsHeroSlides.length} + ${mgHeroSlides.length} hero slides, ${cmsTestimonials.length} + ${mgTestimonials.length} testimonials`)
}
