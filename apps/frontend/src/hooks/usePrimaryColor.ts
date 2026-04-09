import { useState, useEffect } from 'react'

const DEFAULT_PRIMARY_COLOR = '#3B82F6'

/**
 * Reads the --primary CSS variable (HSL components) and returns a usable
 * CSS color string like "hsl(90 50% 50%)".
 */
export function usePrimaryColor(): string {
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_PRIMARY_COLOR)

  useEffect(() => {
    const getPrimaryColor = (): string => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim()

      if (!raw) return DEFAULT_PRIMARY_COLOR

      if (raw.startsWith('#') || raw.startsWith('hsl') || raw.startsWith('rgb')) {
        return raw
      }

      return `hsl(${raw})`
    }

    const updateColor = () => {
      setPrimaryColor(getPrimaryColor())
    }

    updateColor()

    const observer = new MutationObserver(updateColor)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })

    window.addEventListener('systemConfigUpdated', updateColor)

    return () => {
      observer.disconnect()
      window.removeEventListener('systemConfigUpdated', updateColor)
    }
  }, [])

  return primaryColor
}






