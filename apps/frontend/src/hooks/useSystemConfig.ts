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

export function useSystemConfig(): UseSystemConfigReturn {
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings/system')
      if (response.data) {
        setConfig(response.data)

        // Update document title
        if (response.data.system_title) {
          document.title = response.data.system_title
        }

        // Update primary color
        if (response.data.primary_color) {
          document.documentElement.style.setProperty('--primary-color-custom', response.data.primary_color)
          // Also update the CSS primary color
          document.documentElement.style.setProperty('--primary', response.data.primary_color)
        }
      }
    } catch (error) {
      console.error('Error loading system configuration:', error)
      // Don't show toast on initial load to avoid spamming
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

