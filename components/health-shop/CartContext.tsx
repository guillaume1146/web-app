'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface CartItem {
  id: string                  // ProviderInventoryItem ID
  name: string
  genericName?: string
  providerUserId: string
  providerType: string
  providerName?: string
  category: string
  price: number
  quantity: number            // quantity in cart
  maxQuantity: number         // available stock
  requiresPrescription: boolean
  imageUrl?: string | null
  unitOfMeasure: string
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  hasRxItems: boolean
  providerGroups: Map<string, CartItem[]>
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = 'mediwyz_health_shop_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addToCart = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        // Increment, capped at available stock
        return prev.map(i =>
          i.id === item.id
            ? { ...i, quantity: Math.min(i.quantity + 1, i.maxQuantity) }
            : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.id !== id))
      return
    }
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, quantity: Math.min(qty, i.maxQuantity) } : i
    ))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const hasRxItems = items.some(i => i.requiresPrescription)

  // Group items by provider for multi-provider orders
  const providerGroups = new Map<string, CartItem[]>()
  for (const item of items) {
    const key = item.providerUserId
    if (!providerGroups.has(key)) providerGroups.set(key, [])
    providerGroups.get(key)!.push(item)
  }

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice, hasRxItems, providerGroups }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
