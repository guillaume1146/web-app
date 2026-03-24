/**
 * Provider Inventory — Type Definitions
 */

export const SHOP_CATEGORIES = [
  { key: 'medication', label: 'Medications', icon: 'Pill' },
  { key: 'vitamins', label: 'Vitamins & Supplements', icon: 'Leaf' },
  { key: 'first_aid', label: 'First Aid', icon: 'Plus' },
  { key: 'personal_care', label: 'Personal Care', icon: 'Heart' },
  { key: 'eyewear', label: 'Eyewear & Lenses', icon: 'Eye' },
  { key: 'eye_care', label: 'Eye Care Products', icon: 'Droplets' },
  { key: 'dental_care', label: 'Dental Care', icon: 'Smile' },
  { key: 'baby_care', label: 'Baby & Child Care', icon: 'Baby' },
  { key: 'medical_devices', label: 'Medical Devices', icon: 'Activity' },
  { key: 'monitoring', label: 'Health Monitoring', icon: 'Monitor' },
  { key: 'rehab_equipment', label: 'Rehab Equipment', icon: 'Dumbbell' },
  { key: 'nutrition', label: 'Nutrition & Diet', icon: 'Apple' },
  { key: 'other', label: 'Other Health Products', icon: 'Package' },
] as const

export type ShopCategory = typeof SHOP_CATEGORIES[number]['key']

export interface CreateInventoryItemInput {
  name: string
  genericName?: string
  category: string
  description?: string
  imageUrl?: string
  unitOfMeasure?: string
  strength?: string
  dosageForm?: string
  price: number
  quantity: number
  minStockAlert?: number
  requiresPrescription?: boolean
  isFeatured?: boolean
  sideEffects?: string[]
  expiryDate?: Date
}

export interface CreateOrderInput {
  providerUserId: string
  providerType: string
  deliveryType?: string
  deliveryAddress?: string
  deliveryFee?: number
  items: { inventoryItemId: string; quantity: number }[]
}
