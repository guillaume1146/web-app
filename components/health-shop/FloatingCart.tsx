'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FaShoppingCart, FaTimes, FaMinus, FaPlus, FaTrash, FaPrescription } from 'react-icons/fa'
import { useCart } from './CartContext'

export default function FloatingCart() {
  const { items, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart, hasRxItems } = useCart()
  const [open, setOpen] = useState(false)

  if (totalItems === 0) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-40 right-6 z-50 bg-[#0C6780] text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:bg-[#0a5568] transition-all"
      >
        <FaShoppingCart className="text-xl" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {totalItems}
        </span>
      </button>

      {/* Cart panel */}
      {open && (
        <div className="fixed bottom-44 right-6 z-50 w-[360px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-900 text-sm">Cart ({totalItems} items)</h3>
            <div className="flex items-center gap-2">
              <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
              <button onClick={() => setOpen(false)}><FaTimes className="text-gray-400" /></button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Rs {item.price}</span>
                    {item.requiresPrescription && (
                      <FaPrescription className="text-amber-500 text-[10px]" title="Prescription required" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                    <FaMinus className="text-[8px]" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.maxQuantity}
                    className="w-6 h-6 rounded bg-[#0C6780] text-white flex items-center justify-center hover:bg-[#0a5568] disabled:opacity-40">
                    <FaPlus className="text-[8px]" />
                  </button>
                  <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 ml-1">
                    <FaTrash className="text-[8px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50 space-y-3">
            {hasRxItems && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <FaPrescription /> Some items require a prescription
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-lg font-bold text-gray-900">Rs {totalPrice.toLocaleString()}</span>
            </div>
            <Link
              href="/search/health-shop/checkout"
              onClick={() => setOpen(false)}
              className="block w-full text-center bg-[#0C6780] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#0a5568] transition-colors"
            >
              Checkout
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
