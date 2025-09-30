import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RepairPriority, RepairStatus } from '@/types/repairs'

type CustomerOption = { id: number; name: string }
type UserOption = { id: number; name: string }

type BranchOption = { id: number; name: string }

export type RepairDetail = {
  id: number
  code: string
  customer?: { id: number; name: string | null }
  branch?: { id: number; description?: string | null }
  technician?: { id: number; name: string | null }
  device: string
  serial_number?: string | null
  issue_description: string
  status: RepairStatus
  priority: RepairPriority
  cost?: number | null
  sale_price?: number | null
}

export default function RepairDetailDialog(props: {
  open: boolean
  loading: boolean
  editMode: boolean
  options: { statuses: RepairStatus[]; priorities: RepairPriority[] }
  selectedRepair: RepairDetail | null
  editForm: { status: RepairStatus; priority: RepairPriority; cost: number | null; sale_price: number | null; technician_id: number | null; device: string; serial_number: string; issue_description: string; customer_id: number | null; branch_id: number | null }
  setEditForm: (updater: any) => void
  onOpenChange: (open: boolean) => void
  onCancelEdit: () => void
  onSave: () => void
  // search props
  editCustomerSearch: string
  setEditCustomerSearch: (v: string) => void
  editCustomerOptions: CustomerOption[]
  showEditCustomerOptions: boolean
  setShowEditCustomerOptions: (v: boolean) => void
  editTechnicianSearch: string
  setEditTechnicianSearch: (v: string) => void
  editTechnicianOptions: UserOption[]
  showEditTechnicianOptions: boolean
  setShowEditTechnicianOptions: (v: boolean) => void
  editBranchSearch: string
  setEditBranchSearch: (v: string) => void
  editBranchOptions: BranchOption[]
  showEditBranchOptions: boolean
  setShowEditBranchOptions: (v: boolean) => void
  getEstadoBadge: (s: RepairStatus) => string
  getPrioridadBadge: (p: RepairPriority) => string
  onEnterEdit?: () => void
}) {
  const { open, loading, editMode, options, selectedRepair, editForm, setEditForm, onOpenChange, onCancelEdit, onSave } = props
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Editar reparación' : 'Detalle de reparación'}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-6 text-center text-muted-foreground">Cargando...</div>
        ) : selectedRepair ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Código</Label>
                <div className="mt-1 text-sm">{selectedRepair.code || selectedRepair.id}</div>
              </div>
              <div>
                <Label>Cliente</Label>
                {editMode ? (
                  <div className="relative">
                    <Input
                      value={props.editCustomerSearch}
                      onChange={(e) => {
                        const v = e.target.value
                        props.setEditCustomerSearch(v)
                        props.setShowEditCustomerOptions(!!v && v.length >= 1)
                      }}
                      onFocus={() => props.setShowEditCustomerOptions(props.editCustomerSearch.length >= 1)}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        setTimeout(() => props.setShowEditCustomerOptions(false), 120)
                        if (/^\d+$/.test(v)) setEditForm((p: any) => ({ ...p, customer_id: Number(v) }))
                      }}
                      onKeyDown={(e) => { if (e.key === 'Escape') props.setShowEditCustomerOptions(false) }}
                      placeholder="Buscar cliente por nombre o ID..."
                    />
                    {props.editCustomerOptions.length > 0 && props.showEditCustomerOptions && (
                      <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                        {props.editCustomerOptions.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 cursor-pointer hover:bg-gray-100"
                            role="button"
                            tabIndex={0}
                            onMouseDown={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              setEditForm((p: any) => ({ ...p, customer_id: c.id }))
                              props.setEditCustomerSearch(c.name)
                              props.setShowEditCustomerOptions(false)
                              const el = document.activeElement as HTMLElement | null
                              if (el && typeof el.blur === 'function') el.blur()
                            }}
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-sm">{selectedRepair.customer?.name || 'N/D'}</div>
                )}
              </div>
              <div>
                <Label>Sucursal</Label>
                {editMode ? (
                  <div className="relative">
                    <Input
                      value={props.editBranchSearch}
                      onChange={(e) => {
                        const v = e.target.value
                        props.setEditBranchSearch(v)
                        props.setShowEditBranchOptions(!!v && v.length >= 1)
                      }}
                      onFocus={() => props.setShowEditBranchOptions(props.editBranchSearch.length >= 1)}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        setTimeout(() => props.setShowEditBranchOptions(false), 120)
                        if (/^\d+$/.test(v)) setEditForm((p: any) => ({ ...p, branch_id: Number(v) }))
                      }}
                      onKeyDown={(e) => { if (e.key === 'Escape') props.setShowEditBranchOptions(false) }}
                      placeholder="Buscar sucursal por nombre o ID..."
                    />
                    {props.editBranchOptions.length > 0 && props.showEditBranchOptions && (
                      <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                        {props.editBranchOptions.map((b) => (
                          <div
                            key={b.id}
                            className="p-2 cursor-pointer hover:bg-gray-100"
                            role="button"
                            tabIndex={0}
                            onMouseDown={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              setEditForm((p: any) => ({ ...p, branch_id: b.id }))
                              props.setEditBranchSearch(b.name)
                              props.setShowEditBranchOptions(false)
                              const el = document.activeElement as HTMLElement | null
                              if (el && typeof el.blur === 'function') el.blur()
                            }}
                          >
                            {b.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-sm">{selectedRepair.branch?.description || 'N/D'}</div>
                )}
              </div>
              <div>
                <Label>Técnico</Label>
                {editMode ? (
                  <div className="relative">
                    <Input
                      value={props.editTechnicianSearch}
                      onChange={(e) => {
                        const v = e.target.value
                        props.setEditTechnicianSearch(v)
                        props.setShowEditTechnicianOptions(!!v && v.length >= 1)
                      }}
                      onFocus={() => props.setShowEditTechnicianOptions(props.editTechnicianSearch.length >= 1)}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        setTimeout(() => props.setShowEditTechnicianOptions(false), 120)
                        if (/^\d+$/.test(v)) setEditForm((p: any) => ({ ...p, technician_id: Number(v) }))
                      }}
                      onKeyDown={(e) => { if (e.key === 'Escape') props.setShowEditTechnicianOptions(false) }}
                      placeholder="Buscar técnico por nombre o ID..."
                    />
                    {props.editTechnicianOptions.length > 0 && props.showEditTechnicianOptions && (
                      <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                        {props.editTechnicianOptions.map((t) => (
                          <div
                            key={t.id}
                            className="p-2 cursor-pointer hover:bg-gray-100"
                            role="button"
                            tabIndex={0}
                            onMouseDown={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              setEditForm((p: any) => ({ ...p, technician_id: t.id }))
                              props.setEditTechnicianSearch(t.name)
                              props.setShowEditTechnicianOptions(false)
                              const el = document.activeElement as HTMLElement | null
                              if (el && typeof el.blur === 'function') el.blur()
                            }}
                          >
                            {t.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-sm">{selectedRepair.technician?.name || 'Sin asignar'}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Equipo</Label>
                {editMode ? (
                  <Input value={editForm.device} onChange={(e) => setEditForm((p: any) => ({ ...p, device: e.target.value }))} />
                ) : (
                  <div className="mt-1 text-sm">{selectedRepair.device}</div>
                )}
              </div>
              <div>
                <Label>N° Serie</Label>
                {editMode ? (
                  <Input value={editForm.serial_number} onChange={(e) => setEditForm((p: any) => ({ ...p, serial_number: e.target.value }))} />
                ) : (
                  <div className="mt-1 text-sm">{selectedRepair.serial_number || '-'}</div>
                )}
              </div>
            </div>

            <div>
              <Label>Problema</Label>
              {editMode ? (
                <Textarea value={editForm.issue_description} onChange={(e) => setEditForm((p: any) => ({ ...p, issue_description: e.target.value }))} />
              ) : (
                <div className="mt-1 text-sm whitespace-pre-line">{selectedRepair.issue_description}</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Estado</Label>
                {editMode ? (
                  <Select value={editForm.status} onValueChange={(v) => setEditForm((p: any) => ({ ...p, status: v as RepairStatus }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.statuses.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={props.getEstadoBadge(selectedRepair.status)}>{selectedRepair.status}</Badge>
                )}
              </div>
              <div>
                <Label>Prioridad</Label>
                {editMode ? (
                  <Select value={editForm.priority} onValueChange={(v) => setEditForm((p: any) => ({ ...p, priority: v as RepairPriority }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.priorities.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={props.getPrioridadBadge(selectedRepair.priority)}>{selectedRepair.priority}</Badge>
                )}
              </div>
              <div>
                <Label>Costo</Label>
                {editMode ? (
                  <Input type="number" step="0.01" value={editForm.cost ?? ''} onChange={(e) => setEditForm((p: any) => ({ ...p, cost: e.target.value === '' ? null : Number(e.target.value) }))} />
                ) : (
                  <div className="mt-1 text-sm">{typeof selectedRepair.cost === 'number' ? `$${selectedRepair.cost.toFixed(2)}` : '-'}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Precio de venta</Label>
                {editMode ? (
                  <Input type="number" step="0.01" value={editForm.sale_price ?? ''} onChange={(e) => setEditForm((p: any) => ({ ...p, sale_price: e.target.value === '' ? null : Number(e.target.value) }))} />
                ) : (
                  <div className="mt-1 text-sm">{typeof selectedRepair.sale_price === 'number' ? `$${selectedRepair.sale_price.toFixed(2)}` : '-'}</div>
                )}
              </div>
            </div>

            <DialogFooter>
              {editMode ? (
                <>
                  <Button variant="outline" onClick={onCancelEdit}>Cancelar</Button>
                  <Button onClick={onSave}>Guardar Cambios</Button>
                </>
              ) : (
                props.onEnterEdit ? <Button variant="default" onClick={props.onEnterEdit}>Editar</Button> : null
              )}
            </DialogFooter>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">Sin datos</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
