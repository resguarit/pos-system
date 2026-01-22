import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, TrendingUp, AlertTriangle, Settings } from 'lucide-react';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { UpdateExchangeRateDialog } from '@/components/UpdateExchangeRateDialog';
import { cn } from '@/lib/utils';

import { useState } from 'react';

interface ExchangeRateDisplayProps {
  className?: string;
  showRefreshButton?: boolean;
  showUpdateButton?: boolean;
  variant?: 'default' | 'compact' | 'inline';
  fromCurrency?: string;
  toCurrency?: string;
  // onRateUpdate ya no es necesaria, el RefreshContext global maneja esto
}

export function ExchangeRateDisplay({
  className,
  showRefreshButton = false,
  showUpdateButton = false,
  variant = 'default',
  fromCurrency = 'USD',
  toCurrency = 'ARS'
}: ExchangeRateDisplayProps) {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const {
    rate,
    loading,
    error,
    lastUpdated,
    refetch,
    hasValidRate
  } = useExchangeRate({ fromCurrency, toCurrency });

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Nunca';

    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes}m`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;

    return date.toLocaleDateString('es-AR');
  };

  const formatRate = (rateValue: unknown): string => {
    try {
      // Verificar si es null, undefined, o no es un número
      if (rateValue === null || rateValue === undefined) {
        return '1.00';
      }

      // Convertir a número si es string
      const numericValue = typeof rateValue === 'string' ? parseFloat(rateValue) : rateValue;

      // Verificar si es un número válido
      if (typeof numericValue !== 'number' || isNaN(numericValue)) {
        return '1.00';
      }

      // Asegurar que es un número válido y finito
      if (!isFinite(numericValue) || numericValue <= 0) {
        return '1.00';
      }

      return Number(numericValue).toFixed(2);
    } catch {
      return '1.00';
    }
  };

  const getRateStatus = () => {
    if (error) return { variant: 'destructive' as const, icon: AlertTriangle };
    if (!hasValidRate) return { variant: 'secondary' as const, icon: AlertTriangle };
    return { variant: 'default' as const, icon: TrendingUp };
  };

  const status = getRateStatus();

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={status.variant}
                className="flex items-center gap-1"
              >
                <status.icon className="h-3 w-3" />
                {loading ? '...' : `1 USD = $${formatRate(rate)} ARS`}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                1 {fromCurrency} = ${formatRate(rate)} {toCurrency}
              </p>
              <p className="text-xs opacity-75">
                Actualizado: {formatLastUpdated(lastUpdated)}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {showRefreshButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refetch}
                  disabled={loading}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Actualizar precio del dólar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {showUpdateButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    // Obtener la tasa más actual antes de abrir el diálogo
                    await refetch();
                    setUpdateDialogOpen(true);
                  }}
                  disabled={loading}
                  className="h-6 w-6 p-0"
                >
                  <Settings className={cn('h-3 w-3', loading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{loading ? 'Actualizando...' : 'Cambiar precio del dólar'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Dialog para actualizar tasa */}
        <UpdateExchangeRateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          onSuccess={() => {
            refetch();
          }}
          currentRate={rate || 1}
          fromCurrency={fromCurrency}
          toCurrency={toCurrency}
        />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        1 {fromCurrency} = ${formatRate(rate)} {toCurrency}
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant={status.variant} className="flex items-center gap-1">
        <status.icon className="h-3 w-3" />
        <span className="font-mono">
          1 {fromCurrency} = ${loading ? '...' : formatRate(rate)} {toCurrency}
        </span>
      </Badge>

      {showRefreshButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                disabled={loading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Actualizar tasa de cambio</p>
              <p className="text-xs opacity-75">
                Última actualización: {formatLastUpdated(lastUpdated)}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {showUpdateButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  // Obtener la tasa más actual antes de abrir el diálogo
                  await refetch();
                  setUpdateDialogOpen(true);
                }}
                disabled={loading}
                className="h-6 w-6 p-0"
              >
                <Settings className={cn('h-3 w-3', loading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{loading ? 'Actualizando...' : 'Cambiar tasa manualmente'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {error && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-destructive">{error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Dialog para actualizar tasa */}
      <UpdateExchangeRateDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        onSuccess={() => {
          refetch();
          // El triggerRefresh ya se maneja dentro del UpdateExchangeRateDialog
          // onRateUpdate?.(); // Ya no es necesario porque el refresh global se encarga
        }}
        currentRate={rate || 1}
        fromCurrency={fromCurrency}
        toCurrency={toCurrency}
      />
    </div>
  );
}
