import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, Clock, Plus, Search, Wrench, Eye, Pencil, Link2, RefreshCw, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import useApi from "@/hooks/useApi"
import { toast } from "sonner"
import { useBranch } from "@/context/BranchContext"
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper"
import RepairDetailDialog from '@/components/modals/RepairDetailDialog'
import ViewSaleDialog from "@/components/view-sale-dialog"
import { RepairPriority, RepairStatus } from '@/types/repairs'
import type { Repair } from '@/types/repairs'
import RepairsStatusCard from '@/components/cards/RepairsStatusCard'

// Estados considerados "en proceso"
const EN_PROCESO_STATES: RepairStatus[] = [
  RepairStatus["En diagnóstico"],
  RepairStatus["En reparación"],
  RepairStatus["Esperando repuestos"],
]

const getEstadoBadge = (estado: RepairStatus) => {
  const variants: Record<RepairStatus, string> = {
    Recibido: "bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700",
    "En diagnóstico": "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700",
    "En reparación": "bg-orange-50 text-orange-700 hover:bg-orange-50 hover:text-orange-700",
    "Esperando repuestos": "bg-purple-50 text-purple-700 hover:bg-purple-50 hover:text-purple-700",
    Terminado: "bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700",
    Entregado: "bg-gray-50 text-gray-700 hover:bg-gray-50 hover:text-gray-700",
  }
  return variants[estado] || "bg-gray-50 text-gray-700"
}

const getPrioridadBadge = (prioridad: RepairPriority) => {
  const variants: Record<RepairPriority, string> = {
    Alta: "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700",
    Media: "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700",
    Baja: "bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700",
  }
  return variants[prioridad] || "bg-gray-50 text-gray-700"
}


type CustomerOption = { id: number; name: string }
type UserOption = { id: number; name: string }

type NewRepairForm = {
  device: string
  serial_number: string
  issue_description: string
  status: RepairStatus
  priority: RepairPriority
  initial_notes: string
  customer_id: number | null
  technician_id: number | null
}

// Helpers: manage dd/mm/yyyy input and convert to ISO yyyy-mm-dd
const formatDDMMYYYYInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const d = digits.slice(0, 2)
  const m = digits.slice(2, 4)
  const y = digits.slice(4, 8)
  if (digits.length <= 2) return d
  if (digits.length <= 4) return `${d}/${m}`
  return `${d}/${m}/${y}`
}
const ddmmyyyyToIso = (value: string): string | null => {
  if (!value) return null
  const match = value.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/)
  if (!match) return null
  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}
const validateDateRange = (from: string, to: string): string | null => {
  if (from && !ddmmyyyyToIso(from)) return 'Fecha "Desde" inválida'
  if (to && !ddmmyyyyToIso(to)) return 'Fecha "Hasta" inválida'
  const isoFrom = ddmmyyyyToIso(from)
  const isoTo = ddmmyyyyToIso(to)
  if (isoFrom && isoTo && isoFrom > isoTo) return 'La fecha "Desde" no puede ser mayor que "Hasta"'
  return null
}

export default function ReparacionesPage() {
  const { hasPermission } = useAuth();
  const { request } = useApi()
  const { selectedBranchIds, selectionChangeToken } = useBranch()
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEstado, setSelectedEstado] = useState<"all" | RepairStatus>("all")
  const [stats, setStats] = useState({ total: 0, enProceso: 0, terminadas: 0, entregadas: 0 })
  // refs para estabilizar dependencias y evitar bucles
  const searchRef = useRef<string>("")
  const repairsRef = useRef<Repair[]>([])
  // Date filters (intake_date only)
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  const [dateError, setDateError] = useState<string>("")

  // Ordenamiento
  const [sort, setSort] = useState<{ key: 'estado' | 'prioridad' | 'costo' | 'venta' | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' })
  const toggleSort = (key: 'estado' | 'prioridad' | 'costo' | 'venta') => {
    setSort(prev => prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  }

  // Dialog state + form state
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<NewRepairForm>({
    device: "",
    serial_number: "",
    issue_description: "",
    status: RepairStatus.Recibido,
    priority: RepairPriority.Media,
    initial_notes: "",
    customer_id: null,
    technician_id: null,
  })

  // Opciones de estado/prioridad para selects
  const [options, setOptions] = useState<{ statuses: RepairStatus[]; priorities: RepairPriority[] }>({
    statuses: [
      RepairStatus.Recibido,
      RepairStatus["En diagnóstico"],
      RepairStatus["En reparación"],
      RepairStatus["Esperando repuestos"],
      RepairStatus.Terminado,
      RepairStatus.Entregado,
    ],
    priorities: [RepairPriority.Baja, RepairPriority.Media, RepairPriority.Alta],
  })

  // Búsqueda de clientes (crear reparación)
  const [customerSearch, setCustomerSearch] = useState<string>("")
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [showCustomerOptions, setShowCustomerOptions] = useState<boolean>(false)

  // Búsqueda de técnicos (crear reparación)
  const [technicianSearch, setTechnicianSearch] = useState<string>("")
  const [technicianOptions, setTechnicianOptions] = useState<UserOption[]>([])
  const [showTechnicianOptions, setShowTechnicianOptions] = useState<boolean>(false)

  // Búsquedas en modal de edición
  const [editCustomerSearch, setEditCustomerSearch] = useState<string>("")
  const [editCustomerOptions] = useState<CustomerOption[]>([])
  const [showEditCustomerOptions, setShowEditCustomerOptions] = useState<boolean>(false)

  const [editTechnicianSearch, setEditTechnicianSearch] = useState<string>("")
  const [editTechnicianOptions] = useState<UserOption[]>([])
  const [showEditTechnicianOptions, setShowEditTechnicianOptions] = useState<boolean>(false)

  type BranchOption = { id: number; name: string }
  const [editBranchSearch, setEditBranchSearch] = useState<string>("")
  const [editBranchOptions] = useState<BranchOption[]>([])
  const [showEditBranchOptions, setShowEditBranchOptions] = useState<boolean>(false)

  // Link sale dialog state
  const [linkOpenId, setLinkOpenId] = useState<number | null>(null)
  const [linkSaleId, setLinkSaleId] = useState<string>("")
  const [linking, setLinking] = useState(false)

  // Estado del modal Ver/Editar reparación
  const [detailOpen, setDetailOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editForm, setEditForm] = useState<{
    status: RepairStatus;
    priority: RepairPriority;
    cost: number | null;
    technician_id: number | null;
    device: string;
    serial_number: string;
    issue_description: string;
    customer_id: number | null;
    branch_id: number | null;
  }>({
    status: RepairStatus.Recibido,
    priority: RepairPriority.Media,
    cost: null,
    technician_id: null,
    device: "",
    serial_number: "",
    issue_description: "",
    customer_id: null,
    branch_id: null,
  })

  // Vincular venta: listado y búsqueda de ventas recientes
  type SimpleSale = {
    id: number
    receipt_number?: string | null
    date?: string
    total?: number
    customer?: { id: number; person?: { first_name?: string; last_name?: string }; name?: string }
    customer_name?: string
  }
  const [salesSearchTerm, setSalesSearchTerm] = useState<string>("")
  const [salesResults, setSalesResults] = useState<SimpleSale[]>([])
  const [salesLoading, setSalesLoading] = useState<boolean>(false)
  const [salesPage, setSalesPage] = useState<number>(1)
  const salesLimit = 20

  // Helpers para construir params de ventas (lado servidor)
  const buildSalesParams = (extra: Record<string, string | number> = {}) => {
    const params: any = { limit: salesLimit }
    // Filtrar por sucursal si aplica
    if (selectedBranchIds && selectedBranchIds.length > 0 && selectedBranchIds[0] !== 'all') {
      const first = Array.isArray(selectedBranchIds) ? selectedBranchIds[0] : selectedBranchIds
      params.branch_id = first
    }
    Object.entries(extra).forEach(([k, v]) => (params[k] = v))
    return params
  }

  const fetchRecentSales = async (page: number = 1) => {
    try {
      setSalesLoading(true)
      const params = buildSalesParams({ page })
      const resp = await request({ method: 'GET', url: '/sales', params })
      const data = Array.isArray((resp as any)?.data?.data) ? (resp as any).data.data : Array.isArray((resp as any)?.data) ? (resp as any).data : Array.isArray(resp as any) ? (resp as any) : []
      const normalized: SimpleSale[] = (data as any[]).map((s: any) => ({
        id: s.id,
        receipt_number: s.receipt_number || s.receiptNumber || null,
        date: s.date || s.created_at || s.createdAt,
        total: typeof s.total === 'number' ? s.total : Number(s.total) || 0,
        customer: s.customer || undefined,
        customer_name: s.customer_name || (s.customer?.person ? `${s.customer.person.first_name ?? ''} ${s.customer.person.last_name ?? ''}`.trim() : undefined)
      }))
      setSalesResults(normalized)
    } catch (e) {
      setSalesResults([])
    } finally {
      setSalesLoading(false)
    }
  }

  const searchSales = async (term: string, page: number = 1) => {
    try {
      setSalesLoading(true)
      const params = buildSalesParams({ page, search: term })
      const resp = await request({ method: 'GET', url: '/sales', params })
      const data = Array.isArray((resp as any)?.data?.data) ? (resp as any).data.data : Array.isArray((resp as any)?.data) ? (resp as any).data : Array.isArray(resp as any) ? (resp as any) : []
      const normalized: SimpleSale[] = (data as any[]).map((s: any) => ({
        id: s.id,
        receipt_number: s.receipt_number || s.receiptNumber || null,
        date: s.date || s.created_at || s.createdAt,
        total: typeof s.total === 'number' ? s.total : Number(s.total) || 0,
        customer: s.customer || undefined,
        customer_name: s.customer_name || (s.customer?.person ? `${s.customer.person.first_name ?? ''} ${s.customer.person.last_name ?? ''}`.trim() : undefined)
      }))
      setSalesResults(normalized)
    } catch (e) {
      setSalesResults([])
    } finally {
      setSalesLoading(false)
    }
  }

  // Estadísticas derivadas para tarjetas
  const totalReparaciones = stats.total
  const enProceso = stats.enProceso
  const terminadas = stats.terminadas
  const entregadas = stats.entregadas

  // Ordenamiento ahora lo hace el servidor; usar la lista tal cual viene
  const sortedReparaciones = repairs

  // Handlers
  const handleRefresh = () => {
    fetchRepairs()
    fetchStats()
  }

  const resetForm = () => {
    setForm({
      device: "",
      serial_number: "",
      issue_description: "",
      status: RepairStatus.Recibido,
      priority: RepairPriority.Media,
      initial_notes: "",
      customer_id: null,
      technician_id: null
    })
    setCustomerSearch("")
    setTechnicianSearch("")
    setCustomerOptions([])
    setTechnicianOptions([])
  }

  const handleCreateRepair = async () => {
    try {
      if (!form.customer_id) {
        toast.error("Selecciona un cliente")
        return
      }
      if (!form.device.trim() || !form.issue_description.trim()) {
        toast.error("Completa equipo y descripción del problema")
        return
      }
      setCreating(true)
      const payload: any = {
        customer_id: form.customer_id,
        device: form.device.trim(),
        issue_description: form.issue_description.trim(),
        priority: form.priority,
        status: form.status,
      }
      if (form.serial_number.trim()) payload.serial_number = form.serial_number.trim()
      if (form.initial_notes.trim()) payload.initial_notes = form.initial_notes.trim()
      if (form.technician_id) payload.technician_id = form.technician_id
      // branch_id si hay selección
      if (selectedBranchIds && selectedBranchIds[0]) {
        const bid = parseInt(String(selectedBranchIds[0]), 10)
        if (!isNaN(bid)) payload.branch_id = bid
      }

      await request({ method: 'POST', url: '/repairs', data: payload })
      toast.success('Reparación creada')
      setCreateOpen(false)
      resetForm()
      // refrescar datos
      fetchRepairs()
      fetchStats()
    } catch (e: any) {
      console.error('Error creando reparación', e)
      const msg = e?.response?.data?.message || 'No se pudo crear la reparación'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const fetchOptions = useCallback(async (signal?: AbortSignal) => {
    try {
      const resp = await request({ method: 'GET', url: '/repairs/options', signal })
      const statuses = Array.isArray(resp?.statuses) ? resp.statuses : Array.isArray(resp?.data?.statuses) ? resp.data.statuses : undefined
      const priorities = Array.isArray(resp?.priorities) ? resp.priorities : Array.isArray(resp?.data?.priorities) ? resp.data.priorities : undefined
      if (statuses || priorities) {
        setOptions(prev => ({
          statuses: (statuses as RepairStatus[]) || prev.statuses,
          priorities: (priorities as RepairPriority[]) || prev.priorities
        }))
      }
    } catch (e) {
      // keep defaults
    }
  }, [request])

  const fetchRepairs = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      // Prevent fetch when date inputs are invalid
      const hasDate = !!(fromDate || toDate)
      const err = validateDateRange(fromDate, toDate)
      if (hasDate && err) {
        setDateError(err)
        return
      }
      const params: any = {}
      const q = searchRef.current.trim()
      if (q) params.search = q
      if (selectedEstado !== "all") params.status = selectedEstado
      if (selectedBranchIds && selectedBranchIds[0]) params.branch_id = selectedBranchIds[0]
      const isoFrom = ddmmyyyyToIso(fromDate)
      const isoTo = ddmmyyyyToIso(toDate)
      if (isoFrom) params.from_date = isoFrom
      if (isoTo) params.to_date = isoTo
      // Pasar ordenamiento al backend
      if (sort.key) {
        const map: Record<string, string> = { estado: 'status', prioridad: 'priority', costo: 'cost', venta: 'sale_id' }
        const sortBy = map[sort.key]
        if (sortBy) {
          params.sort_by = sortBy
          params.sort_dir = sort.direction
        }
      }
      params.per_page = 50
      const resp = await request({ method: "GET", url: "/repairs", params, signal })
      // Normalizar colecciones paginadas o arrays
      const data = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : Array.isArray(resp?.data?.data) ? resp.data.data : []
      setRepairs(data as Repair[])
    } catch (err: any) {
      if (err?.name !== 'AbortError' && err?.message !== 'canceled') {
        console.error('Error cargando reparaciones', err)
        toast.error('No se pudieron cargar las reparaciones')
        setRepairs([])
      }
    } finally {
      setLoading(false)
    }
  }, [request, selectedEstado, selectedBranchIds, fromDate, toDate, sort, selectionChangeToken])

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
      // Prevent fetch when date inputs are invalid
      const hasDate = !!(fromDate || toDate)
      const err = validateDateRange(fromDate, toDate)
      if (hasDate && err) {
        setDateError(err)
        return
      }
      const params: any = {}
      if (selectedEstado !== "all") params.status = selectedEstado
      if (selectedBranchIds && selectedBranchIds[0]) params.branch_id = selectedBranchIds[0]
      const isoFrom = ddmmyyyyToIso(fromDate)
      const isoTo = ddmmyyyyToIso(toDate)
      if (isoFrom) params.from_date = isoFrom
      if (isoTo) params.to_date = isoTo
      const resp = await request({ method: "GET", url: "/repairs/stats", params, signal })
      if (resp && typeof resp === 'object') {
        setStats({
          total: Number((resp as any).total) || 0,
          enProceso: Number((resp as any).enProceso) || 0,
          terminadas: Number((resp as any).terminadas) || 0,
          entregadas: Number((resp as any).entregadas) || 0,
        })
      }
    } catch (err) {
      // fallback local si falla
      const list: Repair[] = repairsRef.current
      const enProceso = list.filter((r: Repair) => EN_PROCESO_STATES.includes(r.status)).length
      const terminadas = list.filter((r: Repair) => r.status === RepairStatus.Terminado).length
      const entregadas = list.filter((r: Repair) => r.status === RepairStatus.Entregado).length
      setStats({ total: list.length, enProceso, terminadas, entregadas })
    }
  }, [request, selectedEstado, selectedBranchIds, fromDate, toDate, selectionChangeToken])

  // Cargar datos al montar y cuando cambian filtros de sucursal/estado
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    fetchRepairs(signal)
    fetchStats(signal)
    return () => controller.abort()
  }, [fetchRepairs, fetchStats])

  // Debounce de búsqueda (solo por texto)
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    const t = setTimeout(() => {
      fetchRepairs(signal)
      fetchStats(signal)
    }, 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [searchTerm])

  // Búsqueda con debounce
  useEffect(() => {
    if (linkOpenId === null) return
    const t = setTimeout(() => {
      const term = salesSearchTerm.trim()
      setSalesPage(1)
      if (term.length >= 3) {
        searchSales(term, 1)
      } else {
        fetchRecentSales(1)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [salesSearchTerm, linkOpenId])

  // Cambio de página
  useEffect(() => {
    if (linkOpenId === null) return
    const term = salesSearchTerm.trim()
    if (term.length >= 3) {
      searchSales(term, salesPage)
    } else {
      fetchRecentSales(salesPage)
    }
  }, [salesPage, linkOpenId])

  // sincronizar refs
  useEffect(() => { searchRef.current = searchTerm }, [searchTerm])
  useEffect(() => { repairsRef.current = repairs }, [repairs])

  // Precargar datos al montar (mejor UX): opciones
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    fetchOptions(signal)
    return () => controller.abort()
  }, [fetchOptions])

  // Cargar datos al montar y cuando cambian filtros de sucursal/estado
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    fetchRepairs(signal)
    fetchStats(signal)
    return () => controller.abort()
  }, [fetchRepairs, fetchStats])

  // Debounce de búsqueda (solo por texto)
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    const t = setTimeout(() => {
      fetchRepairs(signal)
      fetchStats(signal)
    }, 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [searchTerm])

  // Refetch cuando cambia el ordenamiento (no afecta estadísticas)
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    fetchRepairs(signal)
    return () => controller.abort()
  }, [sort, fetchRepairs])

  const handleView = async (id: number) => {
    try {
      setDetailLoading(true)
      const data = await request({ method: 'GET', url: `/repairs/${id}` })
      const rep: any = (data as any)?.data?.data || (data as any)?.data || data
      setSelectedRepair(rep)
      setEditForm({
        status: rep.status as RepairStatus,
        priority: rep.priority as RepairPriority,
        cost: typeof rep.cost === 'number' ? rep.cost : rep.cost ? Number(rep.cost) : null,
        technician_id: rep.technician?.id ?? rep.technician_id ?? null,
        device: rep.device || "",
        serial_number: rep.serial_number || "",
        issue_description: rep.issue_description || "",
        customer_id: rep.customer?.id ?? rep.customer_id ?? null,
        branch_id: rep.branch?.id ?? rep.branch_id ?? null,
      })
      setEditCustomerSearch(rep.customer?.name || '')
      setEditTechnicianSearch(rep.technician?.name || '')
      setEditBranchSearch(rep.branch?.description || '')
      setEditMode(false)
      setDetailOpen(true)
    } catch (e) {
      toast.error('No se pudo cargar la reparación')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleEdit = async (id: number) => {
    try {
      setDetailLoading(true)
      const data = await request({ method: 'GET', url: `/repairs/${id}` })
      const rep: any = (data as any)?.data?.data || (data as any)?.data || data
      setSelectedRepair(rep)
      setEditForm({
        status: rep.status as RepairStatus,
        priority: rep.priority as RepairPriority,
        cost: typeof rep.cost === 'number' ? rep.cost : rep.cost ? Number(rep.cost) : null,
        technician_id: rep.technician?.id ?? rep.technician_id ?? null,
        device: rep.device || "",
        serial_number: rep.serial_number || "",
        issue_description: rep.issue_description || "",
        customer_id: rep.customer?.id ?? rep.customer_id ?? null,
        branch_id: rep.branch?.id ?? rep.branch_id ?? null,
      })
      setEditCustomerSearch(rep.customer?.name || '')
      setEditTechnicianSearch(rep.technician?.name || '')
      setEditBranchSearch(rep.branch?.description || '')
      setEditMode(true)
      setDetailOpen(true)
    } catch (e) {
      toast.error('No se pudo cargar la reparación para editar')
    } finally {
      setDetailLoading(false)
    }
  }

  const saveRepair = async () => {
    if (!selectedRepair) return
    try {
      const payload: any = {
        status: editForm.status,
        priority: editForm.priority,
        issue_description: editForm.issue_description,
        device: editForm.device,
        serial_number: editForm.serial_number,
      }
      if (editForm.customer_id !== null) payload.customer_id = editForm.customer_id
      if (editForm.branch_id !== null) payload.branch_id = editForm.branch_id
      if (editForm.technician_id !== undefined) payload.technician_id = editForm.technician_id
      if (editForm.cost !== undefined && editForm.cost !== null && !isNaN(Number(editForm.cost))) payload.cost = Number(editForm.cost)

      await request({ method: 'PUT', url: `/repairs/${selectedRepair.id}`, data: payload })
      toast.success('Reparación actualizada')
      setEditMode(false)
      // Refrescar desde backend en lugar de parchar localmente
      await fetchRepairs()
      await fetchStats()
      // Actualizar el detalle abierto con datos frescos del backend
      try {
        const data = await request({ method: 'GET', url: `/repairs/${selectedRepair.id}` })
        const rep: any = (data as any)?.data?.data || (data as any)?.data || data
        setSelectedRepair(rep)
      } catch {
        // si falla, mantener el seleccionado actual
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No se pudo actualizar la reparación')
    }
  }

  const handleLinkSale = async () => {
    if (!linkOpenId) return
    const saleIdNum = parseInt(linkSaleId, 10)
    if (isNaN(saleIdNum) || saleIdNum <= 0) {
      toast.error('Ingresa un ID de venta válido')
      return
    }
    try {
      setLinking(true)
      await request({ method: 'PUT', url: `/repairs/${linkOpenId}`, data: { sale_id: saleIdNum } })
      toast.success('Venta vinculada')
      setLinkOpenId(null)
      setLinkSaleId("")
      fetchRepairs()
      fetchStats()
    } catch (e) {
      toast.error('No se pudo vincular la venta')
    } finally {
      setLinking(false)
    }
  }

  const sortIndicator = (key: 'estado' | 'prioridad' | 'costo' | 'venta') => {
    if (sort.key !== key) return '↕'
    return sort.direction === 'asc' ? '↑' : '↓'
  }

  const niceCustomerName = (s: any) => {
    const fallback = s.customer?.name || s.customer_name || (s.customer?.person ? `${s.customer.person.first_name ?? ''} ${s.customer.person.last_name ?? ''}`.trim() : '')
    if (fallback) return fallback
    if (s.customer && typeof s.customer === 'object') {
      const p = s.customer.person
      if (p) return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
    }
    return 'Cliente'
  }

  // Estado para ver detalle de venta dentro del diálogo de vinculación
  const [viewSaleOpen, setViewSaleOpen] = useState(false)
  const [selectedSaleForView, setSelectedSaleForView] = useState<any | null>(null)

  const handleViewSaleDetail = async (saleId: number) => {
    try {
      const resp = await request({ method: 'GET', url: `/sales/${saleId}` })
      const sale = resp?.data?.data || resp?.data || resp
      setSelectedSaleForView(sale)
      setViewSaleOpen(true)
    } catch (e) {
      toast.error('No se pudo cargar la venta')
    }
  }

  const formatSaleDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Fecha inválida"
    try {
      const date = new Date(dateString)
      return format(date, "dd/MM/yyyy HH:mm", { locale: es })
    } catch {
      return String(dateString)
    }
  }

  const getSaleCustomerName = (sale: any): string => {
    const customer: any = sale?.customer
    const inline = sale?.customer_name
    if (typeof inline === 'string' && inline.trim() !== '') {
      const trimmed = inline.trim()
      if (trimmed === 'Consumidor Final') return '-'
      return trimmed
    }
    if (typeof customer === 'string') {
      const trimmed = customer.trim()
      if (trimmed === 'Consumidor Final') return '-'
      return trimmed || '-'
    }
    if (customer && typeof customer === 'object') {
      if (customer.person) {
        const p = customer.person
        const nombre = [p.first_name, p.last_name].filter(Boolean).join(' ')
        if (nombre) return nombre
      }
      if (customer.name) return String(customer.name)
    }
    return '-'
  }

  const getSaleReceiptType = (sale: any): { displayName: string; afipCode: string } => {
    if (sale.receipt_type && typeof sale.receipt_type === 'object') {
      const upperDescription = (sale.receipt_type.description || "").toUpperCase()
      const afipCode = sale.receipt_type.afip_code || "N/A"
      return { displayName: upperDescription, afipCode }
    }
    const actualReceiptType = (sale as any).receipt_type as string
    const actualAfipCode = (sale as any).receipt_type_code as string
    if (typeof actualReceiptType === 'string' && actualReceiptType.trim() !== '') {
      const upperDescription = actualReceiptType.toUpperCase()
      const afipCode = actualAfipCode || "N/A"
      return { displayName: upperDescription, afipCode }
    }
    return { displayName: "N/A", afipCode: "N/A" }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "$0.00"
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount)
  }

  return (
    <BranchRequiredWrapper
      title="Selecciona una sucursal"
      description="Las reparaciones necesitan una sucursal seleccionada para funcionar correctamente."
      allowMultipleBranches={true}
    >
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Reparaciones</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={handleRefresh} disabled={loading} title="Recargar">
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (open) resetForm(); }}>
              {hasPermission('crear_reparaciones') && (
                <DialogTrigger asChild>
                  <Button className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Reparación
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nueva Reparación</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cliente">Cliente</Label>
                      <div className="relative">
                        <Input
                          value={customerSearch}
                          onChange={(e) => {
                            const v = e.target.value
                            setCustomerSearch(v)
                            setShowCustomerOptions(!!v && v.length >= 1)
                            if (!v) {
                              setForm(p => ({ ...p, customer_id: null }))
                            }
                          }}
                          onFocus={() => setShowCustomerOptions(customerSearch.length >= 1)}
                          onBlur={() => setTimeout(() => setShowCustomerOptions(false), 120)}
                          onKeyDown={(e) => { if (e.key === 'Escape') setShowCustomerOptions(false) }}
                          placeholder="Buscar cliente por nombre..."
                        />
                        {customerOptions.length > 0 && showCustomerOptions && (
                          <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                            {customerOptions.map((c) => (
                              <div
                                key={c.id}
                                className="p-2 cursor-pointer hover:bg-gray-100"
                                role="button"
                                tabIndex={0}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setForm(p => ({ ...p, customer_id: c.id }))
                                  setCustomerSearch(c.name)
                                  setCustomerOptions([])
                                  setShowCustomerOptions(false)
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tecnico">Técnico Asignado</Label>
                      <div className="relative">
                        <Input
                          value={technicianSearch}
                          onChange={(e) => {
                            const v = e.target.value
                            setTechnicianSearch(v)
                            setShowTechnicianOptions(!!v && v.length >= 1)
                            if (!v) {
                              setForm(p => ({ ...p, technician_id: null }))
                            }
                          }}
                          onFocus={() => setShowTechnicianOptions(technicianSearch.length >= 1)}
                          onBlur={() => setTimeout(() => setShowTechnicianOptions(false), 120)}
                          onKeyDown={(e) => { if (e.key === 'Escape') setShowTechnicianOptions(false) }}
                          placeholder="Buscar técnico por nombre..."
                        />
                        {technicianOptions.length > 0 && showTechnicianOptions && (
                          <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                            {technicianOptions.map((t) => (
                              <div
                                key={t.id}
                                className="p-2 cursor-pointer hover:bg-gray-100"
                                role="button"
                                tabIndex={0}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setForm(p => ({ ...p, technician_id: t.id }))
                                  setTechnicianSearch(t.name)
                                  setTechnicianOptions([])
                                  setShowTechnicianOptions(false)
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
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="equipo">Equipo</Label>
                      <Input id="equipo" placeholder="Tipo y modelo del equipo" value={form.device} onChange={(e) => setForm((p) => ({ ...p, device: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serie">Número de Serie</Label>
                      <Input id="serie" placeholder="Número de serie" value={form.serial_number} onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="problema">Descripción del Problema</Label>
                    <Textarea id="problema" placeholder="Describe el problema reportado..." value={form.issue_description} onChange={(e) => setForm((p) => ({ ...p, issue_description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as RepairStatus }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                          {options.statuses.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prioridad">Prioridad</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v as RepairPriority }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                        <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                          {options.priorities.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones Iniciales</Label>
                    <Textarea id="observaciones" placeholder="Observaciones del técnico..." value={form.initial_notes} onChange={(e) => setForm((p) => ({ ...p, initial_notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" className="cursor-pointer" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
                  {hasPermission('crear_reparaciones') && (
                    <Button className="cursor-pointer" onClick={handleCreateRepair} disabled={creating}>{creating ? 'Creando...' : 'Crear Reparación'}</Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dialogo vincular venta */}
        <Dialog open={linkOpenId !== null} onOpenChange={(open) => { if (!open) { setLinkOpenId(null); setLinkSaleId(""); } }}>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle>Vincular venta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-sm">Buscar</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar por cliente, proveedor o producto..."
                    value={salesSearchTerm}
                    onChange={(e) => setSalesSearchTerm(e.target.value)}
                  />
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Últimas ventas</Label>
                <div className="border rounded-md max-h-64 overflow-auto">
                  {salesLoading ? (
                    <div className="p-3 text-sm text-muted-foreground">Cargando ventas...</div>
                  ) : salesResults.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No hay ventas para mostrar</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Nº</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesResults.map((s) => (
                          <TableRow key={s.id} className={Number(linkSaleId) === s.id ? 'bg-purple-50/60' : ''}>
                            <TableCell className="font-medium">
                              {(s.receipt_number && String(s.receipt_number)) || String(s.id).padStart(8, '0')}
                            </TableCell>
                            <TableCell>{niceCustomerName(s)}</TableCell>
                            <TableCell className="hidden sm:table-cell">{formatSaleDate(s.date || null)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(s.total || 0)}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Elegir"
                                  onClick={() => setLinkSaleId(String(s.id))}
                                >
                                  <Check className="h-4 w-4 text-purple-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Ver detalle de la venta"
                                  onClick={() => handleViewSaleDetail(s.id)}
                                >
                                  <Eye className="h-4 w-4 text-purple-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                {/* Controles de paginación */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">Página {salesPage}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={salesPage <= 1 || salesLoading} onClick={() => setSalesPage(p => Math.max(1, p - 1))}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={salesLoading || salesResults.length < salesLimit} onClick={() => setSalesPage(p => p + 1)}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sale_id">ID de Venta (manual)</Label>
                <Input id="sale_id" placeholder="Ej: 123" value={linkSaleId} onChange={(e) => setLinkSaleId(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setLinkOpenId(null); setLinkSaleId("") }} disabled={linking}>Cancelar</Button>
              {hasPermission('vincular_venta_reparaciones') && (
                <Button onClick={handleLinkSale} disabled={linking || !linkSaleId}>{linking ? 'Vinculando...' : 'Vincular'}</Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Ver/Editar reparación */}
        {hasPermission('ver_reparaciones') && (
          <RepairDetailDialog
            open={detailOpen}
            onOpenChange={(open) => { setDetailOpen(open); if (!open) { setSelectedRepair(null); setEditMode(false) } }}
            loading={detailLoading}
            editMode={editMode}
            options={options}
            selectedRepair={selectedRepair ? {
              id: selectedRepair.id,
              code: selectedRepair.code,
              customer: selectedRepair.customer ? { id: selectedRepair.customer.id, name: selectedRepair.customer.name } : undefined,
              branch: selectedRepair.branch ? { id: selectedRepair.branch.id, description: selectedRepair.branch.description } : undefined,
              technician: selectedRepair.technician ? { id: selectedRepair.technician.id, name: selectedRepair.technician.name } : undefined,
              device: selectedRepair.device,
              serial_number: selectedRepair.serial_number ?? null,
              issue_description: selectedRepair.issue_description,
              status: selectedRepair.status,
              priority: selectedRepair.priority,
              cost: (selectedRepair as any).cost ?? null,
              sale_price: (selectedRepair as any).sale_price ?? null,
            } : null}
            editForm={editForm as any}
            setEditForm={setEditForm as any}
            onCancelEdit={() => setEditMode(false)}
            onSave={saveRepair}
            // search props
            editCustomerSearch={editCustomerSearch}
            setEditCustomerSearch={setEditCustomerSearch}
            editCustomerOptions={editCustomerOptions}
            showEditCustomerOptions={showEditCustomerOptions}
            setShowEditCustomerOptions={setShowEditCustomerOptions}
            editTechnicianSearch={editTechnicianSearch}
            setEditTechnicianSearch={setEditTechnicianSearch}
            editTechnicianOptions={editTechnicianOptions}
            showEditTechnicianOptions={showEditTechnicianOptions}
            setShowEditTechnicianOptions={setShowEditTechnicianOptions}
            editBranchSearch={editBranchSearch}
            setEditBranchSearch={setEditBranchSearch}
            editBranchOptions={editBranchOptions}
            showEditBranchOptions={showEditBranchOptions}
            setShowEditBranchOptions={setShowEditBranchOptions}
            getEstadoBadge={getEstadoBadge}
            getPrioridadBadge={getPrioridadBadge}
            onEnterEdit={() => setEditMode(true)}
          />
        )}

        {/* Dialogo de detalle de venta dentro de Vincular venta */}
        {selectedSaleForView && (
          <ViewSaleDialog
            open={viewSaleOpen}
            onOpenChange={setViewSaleOpen}
            sale={selectedSaleForView}
            getCustomerName={getSaleCustomerName as any}
            formatDate={formatSaleDate}
            getReceiptType={getSaleReceiptType as any}
            onDownloadPdf={async (sale) => {
              if (!sale || !sale.id) {
                alert("No se puede descargar el PDF: ID de venta faltante.");
                return;
              }
              try {
                const response = await request({
                  method: 'GET',
                  url: `/pos/sales/${sale.id}/pdf`,
                  responseType: 'blob'
                });
                if (!response || !(response instanceof Blob)) {
                  throw new Error("La respuesta del servidor no es un archivo PDF válido.");
                }
                const blob = new Blob([response], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const receiptTypeDesc = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante').replace(/\s+/g, '_');
                const receiptNumber = sale.receipt_number || sale.id;
                const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error("Error downloading PDF:", error);
                alert("Error al descargar PDF");
              }
            }}
            onSaleUpdated={(updatedSale) => {
              if (selectedSaleForView && selectedSaleForView.id === updatedSale.id) {
                setSelectedSaleForView(updatedSale);
              }
            }}
          />
        )}

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RepairsStatusCard
            title="Total Reparaciones"
            icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
            count={totalReparaciones}
            loading={loading}
            footer={<p className="text-xs text-muted-foreground">Este mes</p>}
          />
          <RepairsStatusCard
            title="En Proceso"
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            count={enProceso}
            loading={loading}
            footer={<p className="text-xs text-muted-foreground">Actualmente</p>}
          />
          <RepairsStatusCard
            title="Terminadas"
            icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
            count={terminadas}
            loading={loading}
            footer={<p className="text-xs text-muted-foreground">Pendientes de entrega</p>}
          />
          <RepairsStatusCard
            title="Entregadas"
            icon={(
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
            )}
            count={entregadas}
            loading={loading}
            footer={<p className="text-xs text-muted-foreground">Este mes</p>}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar reparaciones..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedEstado} onValueChange={(v) => setSelectedEstado(v as "all" | RepairStatus)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value={RepairStatus.Recibido}>{RepairStatus.Recibido}</SelectItem>
                <SelectItem value={RepairStatus["En diagnóstico"]}>{RepairStatus["En diagnóstico"]}</SelectItem>
                <SelectItem value={RepairStatus["En reparación"]}>{RepairStatus["En reparación"]}</SelectItem>
                <SelectItem value={RepairStatus["Esperando repuestos"]}>{RepairStatus["Esperando repuestos"]}</SelectItem>
                <SelectItem value={RepairStatus.Terminado}>{RepairStatus.Terminado}</SelectItem>
                <SelectItem value={RepairStatus.Entregado}>{RepairStatus.Entregado}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs">Desde</Label>
              <Input
                placeholder="dd/mm/aaaa"
                value={fromDate}
                onChange={(e) => setFromDate(formatDDMMYYYYInput(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input
                placeholder="dd/mm/aaaa"
                value={toDate}
                onChange={(e) => setToDate(formatDDMMYYYYInput(e.target.value))}
              />
            </div>
            <Button variant="secondary" className="cursor-pointer" onClick={handleRefresh}>
              Aplicar filtros
            </Button>
          </div>
        </div>
        {dateError && (
          <p className="text-sm text-red-600">{dateError}</p>
        )}

        {/* Tabla */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('estado')}>
                  Estado <span className="ml-1 text-xs">{sortIndicator('estado')}</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('prioridad')}>
                  Prioridad <span className="ml-1 text-xs">{sortIndicator('prioridad')}</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('costo')}>
                  Costo <span className="ml-1 text-xs">{sortIndicator('costo')}</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('venta')}>
                  Venta <span className="ml-1 text-xs">{sortIndicator('venta')}</span>
                </TableHead>
                <TableHead className="w-[220px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReparaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">Sin resultados</TableCell>
                </TableRow>
              ) : (
                sortedReparaciones.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium">{rep.code || rep.id}</TableCell>
                    <TableCell>{rep.customer?.name || '-'}</TableCell>
                    <TableCell>{rep.device}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getEstadoBadge(rep.status)}>{rep.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPrioridadBadge(rep.priority)}>{rep.priority}</Badge>
                    </TableCell>
                    <TableCell>{typeof rep.cost === 'number' ? `$${rep.cost.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</TableCell>
                    <TableCell>{rep.sale?.receipt_number || rep.sale_id || '-'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {hasPermission('ver_reparaciones') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-700 hover:bg-blue-100 hover:text-blue-800 cursor-pointer"
                          onClick={() => handleView(rep.id)}
                          title="Ver"
                          type="button"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('editar_reparaciones') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-orange-700 hover:bg-orange-100 hover:text-orange-800 cursor-pointer"
                          onClick={() => handleEdit(rep.id)}
                          title="Editar"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('vincular_venta_reparaciones') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-purple-700 hover:bg-purple-100 hover:text-purple-800 cursor-pointer"
                          onClick={() => { setLinkOpenId(rep.id); setLinkSaleId(rep.sale?.id ? String(rep.sale.id) : rep.sale_id ? String(rep.sale_id) : '') }}
                          title="Vincular venta"
                          type="button"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </BranchRequiredWrapper>
  )
}