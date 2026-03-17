'use client'

import { ReactNode } from 'react'
import MobileSwipeWrapper from './MobileSwipeWrapper'

interface LandingPageContentProps {
  sections: ReactNode[]
  labels: string[]
}

export default function LandingPageContent({ sections, labels }: LandingPageContentProps) {
  return (
    <MobileSwipeWrapper sectionLabels={labels}>
      {sections}
    </MobileSwipeWrapper>
  )
}
