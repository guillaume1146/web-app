// app/contexts/CartContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface CartMedicine {
 id: number
 name: string
 brand: string
 genericName: string
 category: string
 price: number
 originalPrice: number
 quantity: number
 prescriptionRequired: boolean
 image: string
 manufacturer: string
 expiryDate: string
 stockStatus: string
}

// Input type for medicines being added to cart
export interface MedicineInput {
 id: number
 name: string
 brand: string
 genericName: string
 category: string
 price: number
 originalPrice: number
 prescriptionRequired: boolean
 image: string
 manufacturer: string
 expiryDate: string
 stockStatus: string
 [key: string]: unknown // Allow additional properties
}

interface CartContextType {
 cartItems: CartMedicine[]
 addToCart: (medicine: MedicineInput) => void
 removeFromCart: (id: number) => void
 updateQuantity: (id: number, quantity: number) => void
 clearCart: () => void
 getTotalItems: () => number
 getTotalPrice: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
 const [cartItems, setCartItems] = useState<CartMedicine[]>([])

 // Load cart from localStorage on mount
 useEffect(() => {
 const savedCart = localStorage.getItem('pharmacyCart')
 if (savedCart) {
 try {
 setCartItems(JSON.parse(savedCart))
 } catch (error) {
 console.error('Error loading cart:', error)
 }
 }
 }, [])

 // Save cart to localStorage whenever it changes
 useEffect(() => {
 localStorage.setItem('pharmacyCart', JSON.stringify(cartItems))
 }, [cartItems])

 const addToCart = (medicine: MedicineInput) => {
 setCartItems(prev => {
 const existingItem = prev.find(item => item.id === medicine.id)
 
 if (existingItem) {
 // If item exists, increment quantity
 return prev.map(item =>
 item.id === medicine.id
 ? { ...item, quantity: item.quantity + 1 }
 : item
 )
 } else {
 // Add new item with quantity 1
 const { id, name, brand, genericName, category, price, originalPrice, 
 prescriptionRequired, image, manufacturer, expiryDate, stockStatus } = medicine
 
 const newCartItem: CartMedicine = {
 id,
 name,
 brand,
 genericName,
 category,
 price,
 originalPrice,
 quantity: 1,
 prescriptionRequired,
 image,
 manufacturer,
 expiryDate,
 stockStatus
 }
 
 return [...prev, newCartItem]
 }
 })
 }

 const removeFromCart = (id: number) => {
 setCartItems(prev => prev.filter(item => item.id !== id))
 }

 const updateQuantity = (id: number, quantity: number) => {
 if (quantity <= 0) {
 removeFromCart(id)
 return
 }
 
 setCartItems(prev =>
 prev.map(item =>
 item.id === id ? { ...item, quantity } : item
 )
 )
 }

 const clearCart = () => {
 setCartItems([])
 }

 const getTotalItems = () => {
 return cartItems.reduce((total, item) => total + item.quantity, 0)
 }

 const getTotalPrice = () => {
 return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
 }

 return (
 <CartContext.Provider
 value={{
 cartItems,
 addToCart,
 removeFromCart,
 updateQuantity,
 clearCart,
 getTotalItems,
 getTotalPrice
 }}
 >
 {children}
 </CartContext.Provider>
 )
}

export function useCart() {
 const context = useContext(CartContext)
 if (context === undefined) {
 throw new Error('useCart must be used within a CartProvider')
 }
 return context
}