import React, { createContext, useContext } from 'react'
import useSystemConfig from '@/hooks/useSystemConfig'

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

interface SystemConfigContextType {
  config: SystemConfig | null
  loading: boolean
  refreshConfig: () => Promise<void>
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined)

export function SystemConfigProvider({ children }: { children: React.ReactNode }) {
  const systemConfig = useSystemConfig()

  return (
    <SystemConfigContext.Provider value={systemConfig}>
      {children}
    </SystemConfigContext.Provider>
  )
}

export function useSystemConfigContext() {
  const context = useContext(SystemConfigContext)
  if (context === undefined) {
    throw new Error('useSystemConfigContext must be used within a SystemConfigProvider')
  }
  return context
}

export default SystemConfigContext

