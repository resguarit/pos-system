import type { ReactElement } from 'react'
import { cloneElement, useEffect } from 'react'
import { useCashRegisterContext } from '@/context/CashRegisterContext'

interface CashRegisterProtectedButtonProps {
  children: ReactElement<any>
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

  // Verificar estado cuando cambie el branchId
  useEffect(() => {
    if (branchId) {
      checkCashRegisterStatus(branchId, false)
    }
  }, [branchId, checkCashRegisterStatus])

  // Get the original onClick handler from the child component
  const originalOnClick = children.props?.onClick

  // Create a protected version of the onClick handler
  const protectedOnClick = async (event: any) => {
    const isValidated = await validateCashRegisterForOperation(operationName)
    if (isValidated && originalOnClick) {
      originalOnClick(event)
    }
  }

  // Clone the child element with the protected onClick handler
  return cloneElement(children, {
    ...children.props,
    onClick: protectedOnClick,
    disabled: disabled || children.props?.disabled
  })
}
