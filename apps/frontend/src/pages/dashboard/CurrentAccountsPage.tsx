import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, Search, Plus, DollarSign, Users, TrendingUp, AlertCircle, Loader2, Eye } from 'lucide-react'
import useApi from '@/hooks/useApi'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Tipos de datos
interface CurrentAccount {
  id: number
  customer_id?: number
  supplier_id?: number
  account_type: 'customer' | 'supplier'
  credit_limit: string
  current_balance: string
  created_at: string
  customer?: {
    id: number
    name: string
    email?: string
    phone?: string
    person?: {
      first_name: string
      last_name: string
    }
  }
  supplier?: {
    id: number
    name: string
    email?: string
    phone?: string
  }
}

interface CurrentAccountMovement {
  id: number
  current_account_id: number
  amount: string
  description: string
  movement_type: 'debit' | 'credit'
  reference_type?: string
  reference_id?: number
  cash_movement_id?: number
  created_at: string
  user?: {
    id: number
    name: string
  }
}

interface Customer {
  id: number
  name: string
  email?: string
  phone?: string
  person?: {
    first_name: string
    last_name: string
  }
}

export default function CurrentAccountsPage() {
  const { request } = useApi()
  
  // Estados principales
  const [accounts, setAccounts] = useState<CurrentAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<CurrentAccount | null>(null)
  const [accountMovements, setAccountMovements] = useState<CurrentAccountMovement[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'customer' | 'supplier'>('all')
  
  // Estados de diálogos
  const [isNewAccountDialogOpen, setIsNewAccountDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isMovementsDialogOpen, setIsMovementsDialogOpen] = useState(false)
  
  // Estados de formularios
  const [newAccountForm, setNewAccountForm] = useState({
    customer_id: '',
    account_type: 'customer' as 'customer' | 'supplier',
    credit_limit: '',
  })
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    description: '',
  })

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadCurrentAccounts(),
        loadCustomers(),
      ])
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Error al cargar los datos iniciales')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCurrentAccounts = async () => {
    try {
      const response = await request({
        method: 'GET',
        url: '/current-accounts',
      })
      
      const accountsData = response.data?.data || response.data || []
      setAccounts(Array.isArray(accountsData) ? accountsData : [])
    } catch (error) {
      console.error('Error loading current accounts:', error)
      toast.error('Error al cargar las cuentas corrientes')
      setAccounts([])
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await request({
        method: 'GET',
        url: '/customers',
      })
      
      const customersData = response.data?.data || response.data || []
      setCustomers(Array.isArray(customersData) ? customersData : [])
    } catch (error) {
      console.error('Error loading customers:', error)
      toast.error('Error al cargar los clientes')
      setCustomers([])
    }
  }

  const loadAccountMovements = async (accountId: number) => {
    try {
      const response = await request({
        method: 'GET',
        url: `/current-accounts/${accountId}/movements`,
      })
      
      const movementsData = response.data?.data || response.data || []
      setAccountMovements(Array.isArray(movementsData) ? movementsData : [])
    } catch (error) {
      console.error('Error loading account movements:', error)
      toast.error('Error al cargar los movimientos de la cuenta')
      setAccountMovements([])
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccountForm.customer_id || !newAccountForm.credit_limit) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (parseFloat(newAccountForm.credit_limit) <= 0) {
      toast.error('El límite de crédito debe ser mayor a 0')
      return
    }

    try {
      setIsLoading(true)
      await request({
        method: 'POST',
        url: '/current-accounts',
        data: {
          customer_id: parseInt(newAccountForm.customer_id),
          account_type: newAccountForm.account_type,
          credit_limit: parseFloat(newAccountForm.credit_limit),
        },
      })

      setIsNewAccountDialogOpen(false)
      setNewAccountForm({ customer_id: '', account_type: 'customer', credit_limit: '' })
      toast.success('Cuenta corriente creada exitosamente')
      
      // Recargar cuentas
      await loadCurrentAccounts()
    } catch (error: any) {
      console.error('Error creating current account:', error)
      toast.error(error.response?.data?.message || 'Error al crear la cuenta corriente')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessPayment = async () => {
    if (!selectedAccount || !paymentForm.amount || !paymentForm.description) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (parseFloat(paymentForm.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    try {
      setIsLoading(true)
      await request({
        method: 'POST',
        url: `/current-accounts/${selectedAccount.id}/payments`,
        data: {
          amount: parseFloat(paymentForm.amount),
          description: paymentForm.description,
        },
      })

      setIsPaymentDialogOpen(false)
      setPaymentForm({ amount: '', description: '' })
      toast.success('Pago procesado exitosamente')
      
      // Recargar cuentas y movimientos
      await loadCurrentAccounts()
      if (selectedAccount) {
        await loadAccountMovements(selectedAccount.id)
      }
    } catch (error: any) {
      console.error('Error processing payment:', error)
      toast.error(error.response?.data?.message || 'Error al procesar el pago')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewMovements = async (account: CurrentAccount) => {
    setSelectedAccount(account)
    await loadAccountMovements(account.id)
    setIsMovementsDialogOpen(true)
  }

  // Filtrar cuentas
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = getAccountHolderName(account).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = accountTypeFilter === 'all' || account.account_type === accountTypeFilter
    return matchesSearch && matchesType
  })

  // Funciones auxiliares
  const getAccountHolderName = (account: CurrentAccount): string => {
    if (account.account_type === 'customer' && account.customer) {
      if (account.customer.person) {
        const { first_name, last_name } = account.customer.person
        return `${first_name} ${last_name}`.trim()
      }
      return account.customer.name || 'Cliente'
    }
    if (account.account_type === 'supplier' && account.supplier) {
      return account.supplier.name || 'Proveedor'
    }
    return 'N/A'
  }

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(numAmount)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es })
    } catch {
      return dateString
    }
  }

  // Calcular estadísticas
  const totalAccounts = accounts.length
  const totalCreditLimit = accounts.reduce((sum, account) => sum + parseFloat(account.credit_limit), 0)
  const totalOutstandingBalance = accounts.reduce((sum, account) => sum + parseFloat(account.current_balance), 0)
  const averageCreditLimit = totalAccounts > 0 ? totalCreditLimit / totalAccounts : 0

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando cuentas corrientes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Cuentas Corrientes</h2>
        <Dialog open={isNewAccountDialogOpen} onOpenChange={setIsNewAccountDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nueva Cuenta Corriente</DialogTitle>
              <DialogDescription>
                Configura una nueva cuenta corriente para un cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="account-customer">Cliente</Label>
                <Select
                  value={newAccountForm.customer_id}
                  onValueChange={(value) => setNewAccountForm(prev => ({ ...prev, customer_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.person 
                          ? `${customer.person.first_name} ${customer.person.last_name}`
                          : customer.name
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit-limit">Límite de Crédito</Label>
                <Input
                  id="credit-limit"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={newAccountForm.credit_limit}
                  onChange={(e) => setNewAccountForm(prev => ({ ...prev, credit_limit: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewAccountDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAccount} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Cuenta'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cuentas</CardTitle>
            <Users className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAccounts}</div>
            <p className="text-xs text-muted-foreground">Cuentas activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Límite Total</CardTitle>
            <CreditCard className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCreditLimit)}</div>
            <p className="text-xs text-muted-foreground">Límite de crédito total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstandingBalance)}</div>
            <p className="text-xs text-muted-foreground">Total adeudado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Límite Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageCreditLimit)}</div>
            <p className="text-xs text-muted-foreground">Por cuenta</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar cuentas..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={accountTypeFilter} onValueChange={(value: any) => setAccountTypeFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="customer">Clientes</SelectItem>
              <SelectItem value="supplier">Proveedores</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla de Cuentas */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titular</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Límite de Crédito</TableHead>
              <TableHead className="text-right">Saldo Actual</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead className="hidden md:table-cell">Fecha Creación</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <CreditCard className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                    <span className="text-muted-foreground">
                      {accounts.length === 0 
                        ? 'No hay cuentas corrientes registradas'
                        : 'No se encontraron cuentas que coincidan con la búsqueda'
                      }
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filteredAccounts.map((account) => {
              const creditLimit = parseFloat(account.credit_limit)
              const currentBalance = parseFloat(account.current_balance)
              const available = creditLimit - currentBalance
              
              return (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {getAccountHolderName(account)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        account.account_type === 'customer'
                          ? "bg-blue-50 text-blue-700"
                          : "bg-purple-50 text-purple-700"
                      }
                    >
                      {account.account_type === 'customer' ? 'Cliente' : 'Proveedor'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(creditLimit)}</TableCell>
                  <TableCell className="text-right">
                    <span className={currentBalance > 0 ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(currentBalance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={available < 0 ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(available)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(account.created_at)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMovements(account)}
                        title="Ver movimientos"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAccount(account)
                          setIsPaymentDialogOpen(true)
                        }}
                        title="Procesar pago"
                        className="text-green-600 hover:text-green-700"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog para procesar pagos */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
            <DialogDescription>
              Registra un pago para la cuenta corriente de{' '}
              {selectedAccount && getAccountHolderName(selectedAccount)}
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Saldo Actual</Label>
                <p className="text-sm font-medium text-red-600">
                  {formatCurrency(selectedAccount.current_balance)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto del Pago</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-description">Descripción</Label>
                <Textarea
                  id="payment-description"
                  placeholder="Descripción del pago"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              {paymentForm.amount && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nuevo saldo después del pago:{' '}
                    <span className="font-medium">
                      {formatCurrency(parseFloat(selectedAccount.current_balance) - parseFloat(paymentForm.amount || '0'))}
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleProcessPayment} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Procesar Pago'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver movimientos */}
      <Dialog open={isMovementsDialogOpen} onOpenChange={setIsMovementsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Movimientos de Cuenta</DialogTitle>
            <DialogDescription>
              Historial de movimientos para {selectedAccount && getAccountHolderName(selectedAccount)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <span className="text-muted-foreground">No hay movimientos registrados</span>
                    </TableCell>
                  </TableRow>
                )}
                {accountMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDate(movement.created_at)}</TableCell>
                    <TableCell>{movement.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          movement.movement_type === 'credit'
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }
                      >
                        {movement.movement_type === 'credit' ? 'Pago' : 'Cargo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          movement.movement_type === 'credit' ? "text-green-600" : "text-red-600"
                        }
                      >
                        {movement.movement_type === 'credit' ? '-' : '+'}
                        {formatCurrency(movement.amount)}
                      </span>
                    </TableCell>
                    <TableCell>{movement.user?.name || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsMovementsDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
