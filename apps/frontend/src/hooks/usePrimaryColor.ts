import { useState, useEffect } from 'react'

const DEFAULT_PRIMARY_COLOR = '#3B82F6'
const COLOR_UPDATE_INTERVAL = 1000 // ms

/**
 * Hook para obtener el color primario configurado en el sistema
 * Se actualiza automáticamente cuando cambia la configuración
 */
export function usePrimaryColor(): string {
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_PRIMARY_COLOR)

  useEffect(() => {
    const getPrimaryColor = (): string => {
      // Intentar obtener desde --primary primero
      let color = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim()

      // Fallback a --primary-color-custom
      if (!color) {
        color = getComputedStyle(document.documentElement)
          .getPropertyValue('--primary-color-custom')
          .trim()
      }

      // Si no hay color, usar el por defecto
      if (!color) {
        return DEFAULT_PRIMARY_COLOR
      }

      // Normalizar el formato del color
      if (!color.startsWith('#') && !color.startsWith('hsl')) {
        return `#${color}`
      }

      return color
    }

    const updateColor = () => {
      setPrimaryColor(getPrimaryColor())
    }

    // Actualizar inicialmente
    updateColor()

    // Observar cambios en el DOM
    const observer = new MutationObserver(updateColor)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })

    // Escuchar eventos personalizados si se usan para actualizar el color
    const handleColorUpdate = () => updateColor()
    window.addEventListener('systemConfigUpdated', handleColorUpdate)

    return () => {
      observer.disconnect()
      window.removeEventListener('systemConfigUpdated', handleColorUpdate)
    }
  }, [])

  return primaryColor
}



