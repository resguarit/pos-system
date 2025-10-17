import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpIcon, 
  ArrowDownIcon,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { formatCurrency } from "@/utils/cash-register-utils"

interface BranchStats {
  id: number
  name: string
  isOpen: boolean
  balance: number
  income: number
  expenses: number
  movementsCount: number
  lastMovement?: string
  operator?: string
  openingTime?: string
}

interface BranchComparisonStatsProps {
  branches: BranchStats[]
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  onViewBranchDetails: (branchId: number) => void
}

export const BranchComparisonStats = ({
  branches,
  totalBalance,
  totalIncome,
  totalExpenses,
  onViewBranchDetails
}: BranchComparisonStatsProps) => {
  const getBalancePercentage = (branchBalance: number) => {
    if (totalBalance === 0) return 0
    return (branchBalance / totalBalance) * 100
  }

  const getIncomePercentage = (branchIncome: number) => {
    if (totalIncome === 0) return 0
    return (branchIncome / totalIncome) * 100
  }

  const getExpensesPercentage = (branchExpenses: number) => {
    if (totalExpenses === 0) return 0
    return (branchExpenses / totalExpenses) * 100
  }

  const getStatusColor = (isOpen: boolean) => {
    return isOpen ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
  }

  const getStatusIcon = (isOpen: boolean) => {
    return isOpen ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-600" />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Comparación por Sucursal</h3>
        <p className="text-sm text-muted-foreground">
          Análisis detallado del rendimiento de cada sucursal
        </p>
      </div>

      <div className="grid gap-4">
        {branches.map((branch) => (
          <Card key={branch.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  {branch.name}
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(branch.isOpen)}`}
                  >
                    {getStatusIcon(branch.isOpen)}
                    <span className="ml-1">
                      {branch.isOpen ? 'Abierta' : 'Cerrada'}
                    </span>
                  </Badge>
                </CardTitle>
                <button
                  onClick={() => onViewBranchDetails(branch.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Ver detalles
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Información básica */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-semibold">{formatCurrency(branch.balance)}</p>
                  <Progress 
                    value={getBalancePercentage(branch.balance)} 
                    className="h-2 mt-1"
                  />
                </div>
                
                <div>
                  <p className="text-muted-foreground">Ingresos</p>
                  <p className="font-semibold text-green-600 flex items-center gap-1">
                    <ArrowDownIcon className="h-3 w-3" />
                    {formatCurrency(branch.income)}
                  </p>
                  <Progress 
                    value={getIncomePercentage(branch.income)} 
                    className="h-2 mt-1"
                  />
                </div>
                
                <div>
                  <p className="text-muted-foreground">Egresos</p>
                  <p className="font-semibold text-red-600 flex items-center gap-1">
                    <ArrowUpIcon className="h-3 w-3" />
                    {formatCurrency(branch.expenses)}
                  </p>
                  <Progress 
                    value={getExpensesPercentage(branch.expenses)} 
                    className="h-2 mt-1"
                  />
                </div>
                
                <div>
                  <p className="text-muted-foreground">Movimientos</p>
                  <p className="font-semibold">{branch.movementsCount}</p>
                </div>
              </div>

              {/* Información adicional */}
              {branch.isOpen && (
                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                  {branch.operator && (
                    <p>Operador: <span className="font-medium">{branch.operator}</span></p>
                  )}
                  {branch.openingTime && (
                    <p>Apertura: <span className="font-medium">{branch.openingTime}</span></p>
                  )}
                  {branch.lastMovement && (
                    <p>Último movimiento: <span className="font-medium">{branch.lastMovement}</span></p>
                  )}
                </div>
              )}

              {/* Indicadores de rendimiento */}
              <div className="flex items-center gap-2 pt-2 border-t">
                {branch.income > branch.expenses ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <TrendingUp className="h-3 w-3" />
                    <span>Rentable</span>
                  </div>
                ) : branch.expenses > branch.income ? (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <TrendingDown className="h-3 w-3" />
                    <span>En pérdida</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <Wallet className="h-3 w-3" />
                    <span>Equilibrado</span>
                  </div>
                )}
                
                <div className="ml-auto text-xs text-muted-foreground">
                  {getBalancePercentage(branch.balance).toFixed(1)}% del total
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
