import { useState } from "react"
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

interface OpenCashRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenCashRegister: (openingForm: { opening_balance: string; notes: string }) => void
  loading: boolean
  selectedBranchForAction?: number | null
  branchInfo?: (branchId: number) => any
}

export const OpenCashRegisterDialog = ({
  open,
  onOpenChange,
  onOpenCashRegister,
  loading,
  selectedBranchForAction,
  branchInfo
}: OpenCashRegisterDialogProps) => {
  const [openingForm, setOpeningForm] = useState({
    opening_balance: '',
    notes: '',
  })

  const handleClose = () => {
    setOpeningForm({ opening_balance: '', notes: '' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Abrir Caja</DialogTitle>
          <DialogDescription>
            {selectedBranchForAction 
              ? `Abrir caja para ${branchInfo?.(selectedBranchForAction)?.description || `Sucursal ${selectedBranchForAction}`}`
              : 'Ingresa el saldo inicial para abrir una nueva sesión de caja.'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="opening-balance">Saldo Inicial</Label>
            <Input
              id="opening-balance"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={openingForm.opening_balance}
              onChange={(e) => setOpeningForm(prev => ({ ...prev, opening_balance: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opening-notes">Observaciones (Opcional)</Label>
            <Textarea
              id="opening-notes"
              placeholder="Observaciones sobre la apertura de caja"
              value={openingForm.notes}
              onChange={(e) => setOpeningForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              onOpenCashRegister(openingForm)
              handleClose()
            }} 
            disabled={loading}
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
