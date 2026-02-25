import { useState, useEffect, useCallback } from 'react'
import useApi from './useApi'
import { sileo } from "sileo"
/**
 * Tipo de comprobante AFIP
 */
export interface ArcaReceiptType {
  id: number
  description: string
  // Optional fields for backward compatibility
  code?: number
  from?: string
  to?: string | null
  // Flag para tipos internos (no ARCA)
  isInternal?: boolean
}

/**
 * Punto de venta ARCA
 */
export interface ArcaPointOfSale {
  number: number
  type: string
  enabled: boolean
  from?: string
  to?: string | null
}

/**
 * Estado de ARCA
 */
export interface ArcaStatus {
  enabled: boolean
  environment: string
  has_cuit: boolean
  has_certificates_config: boolean
  certificates_exist: boolean
  cuit: string | null
}

/**
 * Certificado ARCA (multi-CUIT)
 */
export interface ArcaCertificate {
  cuit: string
  formatted_cuit: string
  razon_social: string
  display_name: string
  valid_to: string | null
  is_expiring_soon: boolean
  is_valid?: boolean
  has_certificate?: boolean
  has_private_key?: boolean
  iibb?: string | null
  fecha_inicio_actividades?: string | null
}

/**
 * Hook para interactuar con la API de ARCA
 * 
 * Proporciona funciones para obtener tipos de comprobantes,
 * puntos de venta y verificar el estado de ARCA.
 */
export const useArca = () => {
  const { request } = useApi()
  const [loading, setLoading] = useState(false)
  const [arcaStatus, setArcaStatus] = useState<ArcaStatus | null>(null)
  const [validCertificates, setValidCertificates] = useState<ArcaCertificate[]>([])

  /**
   * Obtener certificados válidos (multi-CUIT)
   */
  const getValidCertificates = useCallback(async (): Promise<ArcaCertificate[]> => {
    try {
      const response = await request({
        method: 'GET',
        url: '/arca/certificates/valid',
      })

      const data = response?.data || []
      setValidCertificates(data)
      return data
    } catch (error) {
      console.error('Error al obtener certificados válidos:', error)
      setValidCertificates([])
      return []
    }
  }, [request])

  /**
   * Verificar si un CUIT tiene certificado válido
   */
  const checkCuitCertificate = useCallback(async (cuit: string): Promise<{
    has_certificate: boolean
    is_valid: boolean
    data?: ArcaCertificate
  }> => {
    try {
      const cleanCuit = cuit.replace(/[^0-9]/g, '')
      const response = await request({
        method: 'GET',
        url: `/arca/certificates/check?cuit=${cleanCuit}`,
      })

      return {
        has_certificate: response?.has_certificate || false,
        is_valid: response?.is_valid || false,
        data: response?.data,
      }
    } catch (error) {
      console.error('Error al verificar certificado:', error)
      return { has_certificate: false, is_valid: false }
    }
  }, [request])

  /**
   * Verificar el estado de configuración de ARCA
   */
  const checkArcaStatus = useCallback(async () => {
    try {
      const response = await request({
        method: 'GET',
        url: '/arca/status',
      })

      const status = response?.data || response
      setArcaStatus(status)
      return status
    } catch (error) {
      console.error('Error al verificar estado de ARCA:', error)
      setArcaStatus({
        enabled: false,
        environment: 'testing',
        has_cuit: false,
        has_certificates_config: false,
        certificates_exist: false,
        cuit: null,
      })
      return null
    }
  }, [request])

  /**
   * Obtener tipos de comprobantes disponibles
   * 
   * @param cuit CUIT para consultar (opcional, usa el configurado si no se proporciona)
   * @returns Array de tipos de comprobantes o null si hay error
   */
  const getReceiptTypes = useCallback(
    async (cuit?: string): Promise<ArcaReceiptType[] | null> => {
      setLoading(true)
      try {
        const url = cuit ? `/arca/receipt-types?cuit=${cuit}` : '/arca/receipt-types'
        const response = await request({
          method: 'GET',
          url,
        })

        const data = response?.data || []
        return data
      } catch (error: any) {
        console.error('Error al obtener tipos de comprobantes:', error)

        // No mostrar error si simplemente no hay tipos configurados
        if (error?.response?.data?.message?.includes('Sin Resultados')) {
          return []
        }

        sileo.error({ title: 'Error al obtener tipos de comprobantes',
          description: error?.response?.data?.message || 'No se pudieron cargar los tipos de comprobantes desde ARCA',
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [request]
  )

  /**
   * Obtener puntos de venta disponibles
   * 
   * @param cuit CUIT para consultar (opcional, usa el configurado si no se proporciona)
   * @param options Opciones adicionales
   * @returns Array de puntos de venta o null si hay error
   */
  const getPointsOfSale = useCallback(
    async (cuit?: string, options: { suppressError?: boolean } = {}): Promise<ArcaPointOfSale[] | null> => {
      setLoading(true)
      try {
        const url = cuit ? `/arca/points-of-sale?cuit=${cuit}` : '/arca/points-of-sale'
        const response = await request({
          method: 'GET',
          url,
        })

        const data = response?.data || []
        return data
      } catch (error: any) {
        console.error('Error al obtener puntos de venta:', error)

        if (options.suppressError) {
          return null
        }

        // No mostrar error si simplemente no hay puntos configurados
        if (error?.response?.data?.message?.includes('Sin Resultados')) {
          return []
        }

        const errorMessage = error?.response?.data?.message || 'No se pudieron cargar los puntos de venta desde ARCA';
        const friendlyMessage = errorMessage.includes('Could not connect to host')
          ? 'No se pudo conectar con ARCA. Verifique su conexión o intente más tarde.'
          : errorMessage;

        sileo.error({ title: 'Error al obtener puntos de venta',
          description: friendlyMessage,
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [request]
  )

  /**
   * Cargar estado de ARCA al montar el componente
   */
  useEffect(() => {
    checkArcaStatus()
    getValidCertificates()
  }, [checkArcaStatus, getValidCertificates])

  return {
    loading,
    arcaStatus,
    validCertificates,
    checkArcaStatus,
    getReceiptTypes,
    getPointsOfSale,
    getValidCertificates,
    checkCuitCertificate,
  }
}
