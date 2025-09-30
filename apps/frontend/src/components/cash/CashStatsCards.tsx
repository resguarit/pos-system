import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  Wallet,
  Coins,
  ArrowUpIcon,
  ArrowDownIcon
} from 'lucide-react'
import type { CashStats } from '@/types/cash.types'

interface CashStatsCardsProps {
  stats: CashStats
  loading?: boolean
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'green' | 'red' | 'blue' | 'gray'
}

const StatCard = React.memo(function StatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  color = 'blue'
}: StatCardProps) {

  const bgColorClasses = {
    green: 'bg-green-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50',
    gray: 'bg-gray-50'
  }

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-full ${bgColorClasses[color]}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trendValue && (
          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
            {getTrendIcon()}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

const CashStatsCards = React.memo(function CashStatsCards({
  stats,
  loading = false
}: CashStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const netTrend = stats.netBalance >= 0 ? 'up' : 'down'
  const netTrendValue = stats.netBalance >= 0 ? 'Balance positivo' : 'Balance negativo'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Balance Actual */}
      <StatCard
        title="Balance Actual"
        value={formatCurrency(stats.currentBalance)}
        icon={<Wallet className="h-4 w-4 text-blue-600" />}
        color="blue"
      />

      {/* Total Ingresos */}
      <StatCard
        title="Total Ingresos"
        value={formatCurrency(stats.totalIncome)}
        icon={<ArrowUpIcon className="h-4 w-4 text-green-600" />}
        trend="up"
        trendValue={`${stats.movementCount > 0 ? Math.round((stats.totalIncome / stats.movementCount)) : 0} promedio`}
        color="green"
      />

      {/* Total Egresos */}
      <StatCard
        title="Total Egresos"
        value={formatCurrency(stats.totalExpenses)}
        icon={<ArrowDownIcon className="h-4 w-4 text-red-600" />}
        trend="down"
        trendValue={`${stats.movementCount > 0 ? Math.round((stats.totalExpenses / stats.movementCount)) : 0} promedio`}
        color="red"
      />

      {/* Balance Neto */}
      <StatCard
        title="Balance Neto"
        value={formatCurrency(stats.netBalance)}
        icon={<BarChart3 className="h-4 w-4 text-gray-600" />}
        trend={netTrend}
        trendValue={netTrendValue}
        color={stats.netBalance >= 0 ? 'green' : 'red'}
      />

      {/* Balance en Efectivo */}
      <StatCard
        title="Balance Efectivo"
        value={formatCurrency(stats.cashOnlyBalance)}
        icon={<Coins className="h-4 w-4 text-yellow-600" />}
        color="gray"
      />

      {/* Balance Inicial */}
      <StatCard
        title="Balance Inicial"
        value={formatCurrency(stats.openingBalance)}
        icon={<DollarSign className="h-4 w-4 text-gray-600" />}
        color="gray"
      />

      {/* Total Movimientos */}
      <StatCard
        title="Total Movimientos"
        value={stats.movementCount.toString()}
        icon={<BarChart3 className="h-4 w-4 text-blue-600" />}
        color="blue"
      />

      {/* Diferencia */}
      <StatCard
        title="Diferencia"
        value={formatCurrency(Math.abs(stats.currentBalance - stats.cashOnlyBalance))}
        icon={<TrendingUp className="h-4 w-4 text-orange-600" />}
        color="gray"
      />
    </div>
  )
})

export default CashStatsCards
