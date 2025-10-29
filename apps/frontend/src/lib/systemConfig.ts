/**
 * Helper functions for working with system configuration
 * Provides type-safe access to system configuration values
 */

import axios from 'axios'

/**
 * Get logo URL - siempre usa /images/logo.jpg del backend como default (igual que PDFs)
 * Solo usa logo_url de config si existe y es válido
 */
export const getLogoUrl = (logoUrl?: string | null): string => {
  // Si hay logo_url configurado y es válido, usarlo
  if (logoUrl && logoUrl.trim() !== '') {
    return logoUrl;
  }
  
  // Default: usar directamente /images/logo.jpg del backend (igual que PDFs)
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.heroedelwhisky.com.ar/api';
  const baseUrl = apiBaseUrl.replace('/api', '') || 'https://api.heroedelwhisky.com.ar';
  return `${baseUrl}/images/logo.jpg`;
}

export interface SystemConfig {
  logo_url?: string | null
  favicon_url?: string | null
  system_title?: string
  primary_color?: string
  company_name?: string
  company_ruc?: string
  company_address?: string
  company_email?: string
  company_phone?: string
}

/**
 * Get the current system configuration
 * Returns the configuration from the API
 */
export const getSystemConfig = async (): Promise<SystemConfig> => {
  try {
    const response = await axios.get('/api/settings/system')
    return response.data
  } catch (error) {
    console.error('Error fetching system configuration:', error)
    throw error
  }
}

/**
 * Update system configuration
 * @param config - The configuration object to update
 */
export const updateSystemConfig = async (config: Partial<SystemConfig>): Promise<void> => {
  try {
    await axios.put('/api/settings/system', config)
  } catch (error) {
    console.error('Error updating system configuration:', error)
    throw error
  }
}

/**
 * Upload an image (logo or favicon)
 * @param file - The image file to upload
 * @param type - Either 'logo' or 'favicon'
 */
export const uploadSystemImage = async (file: File, type: 'logo' | 'favicon'): Promise<string> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await axios.post('/api/settings/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    return response.data.url
  } catch (error) {
    console.error('Error uploading system image:', error)
    throw error
  }
}

/**
 * Get a specific setting value
 * @param key - The setting key to retrieve
 */
export const getSystemSetting = async (key: string): Promise<unknown> => {
  try {
    const response = await axios.get(`/api/settings/${key}`)
    return response.data.value
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error)
    throw error
  }
}

/**
 * Default values for system configuration
 */
export const DEFAULT_SYSTEM_CONFIG: Required<SystemConfig> = {
  logo_url: null,
  favicon_url: null,
  system_title: 'RG Gestión',
  primary_color: '#3B82F6',
  company_name: '',
  company_ruc: '',
  company_address: '',
  company_email: '',
  company_phone: ''
}

