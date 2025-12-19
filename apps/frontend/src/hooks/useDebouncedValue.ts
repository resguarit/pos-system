import { useState, useEffect } from 'react'

/**
 * Hook que devuelve un valor "debounced" que solo se actualiza después de
 * que el valor original deje de cambiar durante el tiempo especificado.
 * 
 * @param value El valor a debouncear
 * @param delay Tiempo de espera en milisegundos (default: 300ms)
 * @returns El valor debounceado
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])

    return debouncedValue
}
