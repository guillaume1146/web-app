'use client'

import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'

const faqs = [
  {
    question: 'How do I book a video consultation with a doctor?',
    answer: 'Simply create an account, browse our directory of verified doctors, and book an available time slot. You can have a video consultation from the comfort of your home using any device with a camera.',
  },
  {
    question: 'Is MediWyz available outside Mauritius?',
    answer: 'MediWyz is currently focused on Mauritius, but we are expanding to other countries in the Indian Ocean region and Africa. Regional administrators help us launch in new territories.',
  },
  {
    question: 'How much does a consultation cost?',
    answer: 'Consultation costs vary by provider and specialty. Our Essential plan starts at Rs 250/month and includes 1 free GP consultation. With the Plus plan (Rs 500/month), you get unlimited GP consultations.',
  },
  {
    question: 'Are the doctors and nurses on MediWyz verified?',
    answer: 'Yes. All healthcare professionals must submit their professional licenses, registration certificates, and identification documents during registration. Our team verifies these credentials before activating their accounts.',
  },
  {
    question: 'Can I order medicines through MediWyz?',
    answer: 'Yes! After a consultation, your doctor can send an e-prescription directly to a pharmacy on the platform. You can also browse pharmacy inventories and place orders for delivery.',
  },
  {
    question: 'What is the trial wallet?',
    answer: 'Every new user receives Rs 4,500 in trial credits to explore the platform — book consultations, order medicines, and try lab tests. You can top up your wallet anytime with real funds via MCB Juice or card.',
  },
  {
    question: 'Does MediWyz offer corporate wellness plans?',
    answer: 'Yes. We offer corporate plans starting from Rs 140/employee/month. Corporate administrators can manage employee enrollment, track usage analytics, and access HR dashboards.',
  },
  {
    question: 'How do I become a healthcare provider on MediWyz?',
    answer: 'Register as a Doctor, Nurse, Pharmacist, Lab Technician, or Emergency Worker. Upload your professional documents, and once verified, you can start receiving patients and consultations.',
  },
]

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <section className="py-16 sm:py-20 bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Everything you need to know about MediWyz and how it works.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                <FaChevronDown
                  className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === idx && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
