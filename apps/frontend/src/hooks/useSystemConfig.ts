import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface SystemConfig {
  logo_url: string | null
  favicon_url: string | null
  system_title: string
  primary_color: string
  company_name: string
  company_ruc: string
  company_address: string
  company_email: string
  company_phone: string
}

interface UseSystemConfigReturn {
  config: SystemConfig | null
  loading: boolean
  refreshConfig: () => Promise<void>
}

function hexToHslComponents(hex: string): string | null {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return null

  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }

  const hDeg = Math.round(h * 3600) / 10
  const sPct = Math.round(s * 1000) / 10
  const lPct = Math.round(l * 1000) / 10
  return `${hDeg} ${sPct}% ${lPct}%`
}

function colorToHslComponents(value: string): string | null {
  const v = value.trim()
  if (!v) return null

  let hex = v
  if (!hex.startsWith('#') && /^[0-9a-fA-F]{3,6}$/.test(hex)) {
    hex = `#${hex}`
  }
  if (hex.startsWith('#')) return hexToHslComponents(hex)

  return null
}

export function useSystemConfig(): UseSystemConfigReturn {
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings/system')
      if (response.data) {
        setConfig(response.data)

        if (response.data.system_title) {
          document.title = response.data.system_title
        }

        if (response.data.primary_color) {
          const hsl = colorToHslComponents(response.data.primary_color)
          if (hsl) {
            document.documentElement.style.setProperty('--primary', hsl)
          }
        }
      }
    } catch (error) {
      console.error('Error loading system configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return {
    config,
    loading,
    refreshConfig: fetchConfig
  }
}

export default useSystemConfig

