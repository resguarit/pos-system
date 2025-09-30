import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Trash2, 
  Eye, 
  ArrowUpIcon, 
  ArrowDownIcon,
  FileText,
  ShoppingCart
} from 'lucide-react'
import type { CashMovement } from '@/types/cash.types'

interface CashMovementsTableProps {
  movements: CashMovement[]
  loading: boolean
  onDeleteMovement: (movementId: number) => void
  onViewSale?: (saleId: number) => void
  onViewPurchaseOrder?: (purchaseOrderId: number) => void
  onSearch?: (searchTerm: string) => void
  onFilterByType?: (type: 'income' | 'expense' | 'all') => void
}

const CashMovementsTable = React.memo(function CashMovementsTable({
  movements,
  loading,
  onDeleteMovement,
  onViewSale,
  onViewPurchaseOrder,
  onSearch,
  onFilterByType
}: CashMovementsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterType, setFilterType] = React.useState<'income' | 'expense' | 'all'>('all')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR')
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    onSearch?.(value)
  }

  const handleFilterChange = (value: string) => {
    const type = value as 'income' | 'expense' | 'all'
    setFilterType(type)
    onFilterByType?.(type)
  }

  const getTypeIcon = (type: 'income' | 'expense') => {
    return type === 'income' ? (
      <ArrowUpIcon className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownIcon className="h-4 w-4 text-red-600" />
    )
  }

  const getTypeBadge = (type: 'income' | 'expense') => {
    return type === 'income' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Ingreso
      </Badge>
    ) : (
      <Badge variant="destructive">
        Egreso
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex space-x-4">
          <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="border rounded-lg">
          <div className="h-64 bg-gray-100 animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          No hay movimientos
        </h3>
        <p className="text-gray-500">
          No se encontraron movimientos de caja para mostrar
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar movimientos..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={filterType} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Ingresos</SelectItem>
            <SelectItem value="expense">Egresos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[120px]">Monto</TableHead>
              <TableHead className="w-[150px]">Usuario</TableHead>
              <TableHead className="w-[150px]">Fecha</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(movement.type)}
                    {getTypeBadge(movement.type)}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{movement.description}</div>
                    <div className="text-sm text-gray-500">
                      {movement.movement_type_name}
                    </div>
                    {/* Mostrar si está relacionado con venta o compra */}
                    {(movement.sale_id || movement.purchase_order_id) && (
                      <div className="flex items-center space-x-2 mt-1">
                        {movement.sale_id && (
                          <Badge variant="outline" className="text-xs">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Venta #{movement.sale_id}
                          </Badge>
                        )}
                        {movement.purchase_order_id && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            Compra #{movement.purchase_order_id}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-medium ${
                    movement.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.type === 'income' ? '+' : '-'}
                    {formatCurrency(movement.amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {movement.user_name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDate(movement.created_at)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {/* Botón para ver venta */}
                    {movement.sale_id && onViewSale && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewSale(movement.sale_id!)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Botón para ver compra */}
                    {movement.purchase_order_id && onViewPurchaseOrder && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewPurchaseOrder(movement.purchase_order_id!)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Botón para eliminar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteMovement(movement.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Resumen */}
      <div className="text-sm text-gray-600 text-center">
        Mostrando {movements.length} movimiento{movements.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
})

export default CashMovementsTable


