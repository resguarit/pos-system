import type { ReactElement } from 'react'
import { cloneElement, useCallback, useEffect, useRef, useState } from 'react'
import { useCashRegisterContext } from '@/context/CashRegisterContext'
import { Loader2 } from 'lucide-react'

interface CashRegisterProtectedButtonProps {
  children: ReactElement<Record<string, unknown>>
  branchId: number
  operationName?: string
  disabled?: boolean
}

export default function CashRegisterProtectedButton({
  children,
  branchId,
  operationName = 'esta operación',
  disabled = false
}: CashRegisterProtectedButtonProps) {
  const { validateCashRegisterForOperation, checkCashRegisterStatus } = useCashRegisterContext()
  const [isValidating, setIsValidating] = useState(false)
  const onClickRef = useRef(children.props?.onClick)

  // Mantener ref actualizada con el handler del hijo (evita dependencia que cambia cada render)
  onClickRef.current = children.props?.onClick

  // Verificar estado cuando cambie el branchId
  useEffect(() => {
    if (branchId) {
      checkCashRegisterStatus(branchId, false)
    }
  }, [branchId, checkCashRegisterStatus])

  const protectedOnClick = useCallback(async (event: React.MouseEvent) => {
    if (isValidating) return

    setIsValidating(true)
    try {
      const isValidated = await validateCashRegisterForOperation(operationName)
      const handler = onClickRef.current
      if (isValidated && typeof handler === 'function') {
        await handler(event)
      }
    } finally {
      setIsValidating(false)
    }
  }, [isValidating, validateCashRegisterForOperation, operationName])

  return cloneElement(children, {
    ...children.props,
    onClick: protectedOnClick,
    disabled: disabled || children.props?.disabled || isValidating,
    children: (
      <>
        {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children.props.children}
      </>
    )
  })
}
