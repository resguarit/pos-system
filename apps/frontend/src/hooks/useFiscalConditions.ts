import { useEffect, useState } from "react"
import useApi from "./useApi"

export interface FiscalCondition {
  id: number
  name: string
  description?: string | null
  active?: boolean
  afip_code?: string
}

/**
 * Hook reutilizable para cargar condiciones fiscales desde la API.
 * Única fuente de verdad para el listado y evita IDs hardcodeados en formularios.
 */
export function useFiscalConditions(): {
  fiscalConditions: FiscalCondition[]
  isLoading: boolean
  error: Error | null
} {
  const { request } = useApi()
  const [fiscalConditions, setFiscalConditions] = useState<FiscalCondition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await request({
          method: "GET",
          url: "/fiscal-conditions",
          signal: controller.signal,
        })
        const list = Array.isArray(res) ? res : (res as { data?: FiscalCondition[] })?.data ?? []
        if (!cancelled && Array.isArray(list)) {
          setFiscalConditions(list)
        }
      } catch (err) {
        if (!cancelled && err instanceof Error && err.name !== "AbortError" && err.name !== "CanceledError") {
          setError(err)
          setFiscalConditions([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [request])

  return { fiscalConditions, isLoading, error }
}
