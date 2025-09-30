import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UseFormSubmitOptions {
  onSuccess?: () => void
  onError?: (error: any) => void
  successMessage?: string
  errorMessage?: string
}

export function useFormSubmit(options: UseFormSubmitOptions = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (
    submitFn: () => Promise<any>,
    customOptions?: Partial<UseFormSubmitOptions>
  ) => {
    if (isSubmitting) return // Prevenir doble envío

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await submitFn()
      
      // Mensaje de éxito
      const successMsg = customOptions?.successMessage || options.successMessage
      if (successMsg) {
        toast.success(successMsg)
      }
      
      // Callback de éxito
      if (customOptions?.onSuccess || options.onSuccess) {
        ;(customOptions?.onSuccess || options.onSuccess)?.()
      }
      
      return result
    } catch (err: any) {
      const errorMsg = err?.message || customOptions?.errorMessage || options.errorMessage || 'Error al procesar la solicitud'
      setError(errorMsg)
      
      // Callback de error
      if (customOptions?.onError || options.onError) {
        ;(customOptions?.onError || options.onError)?.(err)
      } else {
        toast.error(errorMsg)
      }
      
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, options])

  const reset = useCallback(() => {
    setIsSubmitting(false)
    setError(null)
  }, [])

  return {
    isSubmitting,
    error,
    handleSubmit,
    reset
  }
}

// Hook específico para formularios con react-hook-form
export function useFormSubmitWithValidation() {
  const { isSubmitting, error, handleSubmit, reset } = useFormSubmit()
  
  // Función que combina validación de react-hook-form con el manejo de submit
  const onSubmit = useCallback(async (
    submitFn: () => Promise<any>,
    customOptions?: Partial<UseFormSubmitOptions>
  ) => {
    return handleSubmit(submitFn, customOptions)
  }, [handleSubmit])

  return {
    isSubmitting,
    error,
    onSubmit,
    reset,
    // Props útiles para componentes
    submitProps: {
      disabled: isSubmitting,
      isLoading: isSubmitting
    },
    fieldProps: {
      disabled: isSubmitting
    }
  }
}
