'use client'

import { CartProvider } from '@/components/health-shop/CartContext'

export default function HealthShopLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
