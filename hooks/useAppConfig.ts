// hooks/useAppConfig.ts
import { useState, useEffect } from 'react'

interface AppConfig {
  appName: string
  appTagline: string
  heroTitle: string
  platformDescription: string
}

export const useAppConfig = () => {
  const [config, setConfig] = useState<AppConfig>({
    appName: "MediWyz", // Default fallback
    appTagline: "Your trusted healthcare companion in Mauritius",
    heroTitle: "Your Health, Our Priority",
    platformDescription: "Mauritius's Leading Digital Health Platform"
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  return { config, loading }
}