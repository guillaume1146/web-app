'use client'

import { Icon } from '@iconify/react'

interface DynamicIconProps {
  iconKey?: string | null
  emoji?: string | null
  size?: number | string
  color?: string
  className?: string
  fallbackIcon?: string
}

export default function DynamicIcon({
  iconKey,
  emoji,
  size = 24,
  color,
  className = '',
  fallbackIcon = 'healthicons:health-worker',
}: DynamicIconProps) {
  if (iconKey) {
    return (
      <Icon
        icon={iconKey}
        width={size}
        height={size}
        color={color}
        className={className}
      />
    )
  }
  if (emoji) {
    const px = typeof size === 'number' ? size : parseInt(size as string) || 24
    return (
      <span
        role="img"
        style={{ fontSize: px, lineHeight: 1 }}
        className={`select-none ${className}`}
      >
        {emoji}
      </span>
    )
  }
  return (
    <Icon
      icon={fallbackIcon}
      width={size}
      height={size}
      color={color}
      className={className}
    />
  )
}
