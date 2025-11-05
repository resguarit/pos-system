import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 1024 // lg breakpoint en Tailwind

/**
 * Hook para detectar si el dispositivo es móvil/tablet
 * Basado en el ancho de la ventana
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // SSR-safe: verificar si window está disponible
    if (typeof window === 'undefined') {
      return false
    }
    return window.innerWidth < MOBILE_BREAKPOINT
  })

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Verificar inicialmente
    checkMobile()

    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return isMobile
}



