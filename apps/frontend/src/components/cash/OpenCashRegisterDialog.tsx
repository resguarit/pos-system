import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import useApi from "@/hooks/useApi"
import { toast } from "sonner"

// ============================================================================
// Types
// ============================================================================

interface OpeningForm {
  opening_balance: string
  notes: string
}

interface LastClosureResponse {
  message: string
  data: {
    last_closure_amount: number | null
    branch_id: number
    has_previous_closure: boolean
  }
}

interface BranchInfo {
  id: number
  description: string
}

interface OpenCashRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenCashRegister: (openingForm: OpeningForm) => void
  loading: boolean
  selectedBranchForAction?: number | null
  branchInfo?: (branchId: number) => BranchInfo | undefined
  currentBranchId?: number
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPENING_BALANCE = '0'
const EMPTY_FORM: OpeningForm = {
  opening_balance: '',
  notes: '',
}

export const OpenCashRegisterDialog = ({
  open,
  onOpenChange,
  onOpenCashRegister,
  loading,
  selectedBranchForAction,
  branchInfo,
  currentBranchId
}: OpenCashRegisterDialogProps) => {
  const { request } = useApi()
  const [openingForm, setOpeningForm] = useState<OpeningForm>(EMPTY_FORM)
  const [loadingLastClosure, setLoadingLastClosure] = useState(false)
  const [hasLoadedFromLastClosure, setHasLoadedFromLastClosure] = useState(false)

  // Determinar el branchId a usar
  const branchIdToUse = useMemo(() => {
    return selectedBranchForAction || currentBranchId || null
  }, [selectedBranchForAction, currentBranchId])

  /**
   * Carga el último cierre de caja para la sucursal especificada
   */
  const loadLastClosure = useCallback(async (branchId: number): Promise<void> => {
    if (!branchId || branchId <= 0) {
      console.warn('Invalid branchId provided to loadLastClosure:', branchId)
      return
    }

    setLoadingLastClosure(true)
    setHasLoadedFromLastClosure(false)

    try {
      const response = await request<LastClosureResponse>({
        method: 'GET',
        url: '/cash-registers/last-closure',
        params: { branch_id: branchId }
      })

      const lastClosureAmount = response?.data?.last_closure_amount

      if (lastClosureAmount !== null && lastClosureAmount !== undefined && lastClosureAmount >= 0) {
        setOpeningForm(prev => ({
          ...prev,
          opening_balance: lastClosureAmount.toString()
        }))
        setHasLoadedFromLastClosure(true)
      } else {
        // Si no hay último cierre, usar valor por defecto
        setOpeningForm(prev => ({
          ...prev,
          opening_balance: DEFAULT_OPENING_BALANCE
        }))
        setHasLoadedFromLastClosure(false)
      }
    } catch (error: unknown) {
      console.error('Error al cargar el último cierre:', error)

      // En caso de error, dejar el campo vacío para que el usuario lo ingrese manualmente
      setOpeningForm(prev => ({
        ...prev,
        opening_balance: ''
      }))
      setHasLoadedFromLastClosure(false)

      // Mostrar mensaje de error solo si no es un error de validación esperado
      const errorMessage = error instanceof Error
        ? error.message
        : 'Error desconocido al cargar el último cierre'

      if (!errorMessage.includes('422') && !errorMessage.includes('404')) {
        toast.error('No se pudo cargar el último cierre. Por favor, ingresa el saldo manualmente.')
      }
    } finally {
      setLoadingLastClosure(false)
    }
  }, [request])

  /**
   * Maneja el cambio en el campo de saldo inicial
   */
  const handleOpeningBalanceChange = useCallback((value: string) => {
    // Permitir solo números y punto decimal
    const sanitizedValue = value.replace(/[^0-9.]/g, '')
    setOpeningForm(prev => ({
      ...prev,
      opening_balance: sanitizedValue
    }))
    // Si el usuario modifica manualmente, marcar que ya no viene del último cierre
    if (hasLoadedFromLastClosure) {
      setHasLoadedFromLastClosure(false)
    }
  }, [hasLoadedFromLastClosure])

  /**
   * Maneja el cambio en el campo de notas
   */
  const handleNotesChange = useCallback((value: string) => {
    setOpeningForm(prev => ({
      ...prev,
      notes: value
    }))
  }, [])

  /**
   * Maneja el cierre del diálogo
   */
  const handleClose = useCallback(() => {
    setOpeningForm(EMPTY_FORM)
    setHasLoadedFromLastClosure(false)
    onOpenChange(false)
  }, [onOpenChange])

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = useCallback(() => {
    onOpenCashRegister(openingForm)
    handleClose()
  }, [openingForm, onOpenCashRegister, handleClose])

  // Cargar el último cierre cuando se abre el dialog
  useEffect(() => {
    if (open && branchIdToUse) {
      loadLastClosure(branchIdToUse)
    } else if (open && !branchIdToUse) {
      // Si no hay branchId, limpiar el formulario
      setOpeningForm(EMPTY_FORM)
      setHasLoadedFromLastClosure(false)
    } else if (!open) {
      // Limpiar el formulario cuando se cierra el dialog
      setOpeningForm(EMPTY_FORM)
      setHasLoadedFromLastClosure(false)
    }
  }, [open, branchIdToUse, loadLastClosure])

  // Obtener información de la sucursal para mostrar
  const branchDescription = useMemo(() => {
    if (!branchIdToUse) return null
    return branchInfo?.(branchIdToUse)?.description || `Sucursal ${branchIdToUse}`
  }, [branchIdToUse, branchInfo])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Abrir Caja</DialogTitle>
          <DialogDescription>
            {branchDescription
              ? `Abrir caja para ${branchDescription}`
              : 'Ingresa el saldo inicial para abrir una nueva sesión de caja.'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="opening-balance">
              Saldo Inicial (Efectivo)
              <span className="text-destructive ml-1">*</span>
            </Label>
            {loadingLastClosure && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Cargando último cierre...</span>
              </div>
            )}
            <Input
              id="opening-balance"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={openingForm.opening_balance}
              onChange={(e) => handleOpeningBalanceChange(e.target.value)}
              disabled={loadingLastClosure || loading}
              aria-label="Saldo inicial de la caja"
              aria-describedby={hasLoadedFromLastClosure ? "last-closure-info" : undefined}
            />
            {!loadingLastClosure && hasLoadedFromLastClosure && (
              <p
                id="last-closure-info"
                className="text-xs text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                ✓ Cargado desde el último cierre de caja
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="opening-notes">Observaciones (Opcional)</Label>
            <Textarea
              id="opening-notes"
              placeholder="Observaciones sobre la apertura de caja"
              value={openingForm.notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={loading}
              rows={3}
              maxLength={500}
              aria-label="Observaciones sobre la apertura de caja"
            />
            {openingForm.notes.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                {openingForm.notes.length}/500 caracteres
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading || loadingLastClosure}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || loadingLastClosure || !openingForm.opening_balance}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Abriendo...
              </>
            ) : (
              'Abrir Caja'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
