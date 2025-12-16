<?php
/**
 * Script para verificar si el efectivo en caja cuadra correctamente
 * 
 * Uso: 
 *   php verificar-caja.php              # Verifica la caja abierta actual
 *   php verificar-caja.php [caja_id]    # Verifica una caja específica
 *   php verificar-caja.php --all        # Lista todas las cajas con diferencias
 * 
 * Ejemplo: php verificar-caja.php 15
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

echo "\n";
echo "═══════════════════════════════════════════════════════════════════\n";
echo "          VERIFICACIÓN DE CAJA - CONTROL DE EFECTIVO\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";

// Determinar qué caja verificar
$param = $argv[1] ?? null;

if ($param === '--all') {
    verificarTodasLasCajas();
} elseif ($param !== null && is_numeric($param)) {
    verificarCaja((int)$param);
} else {
    // Buscar caja abierta
    $cajaAbierta = DB::table('cash_registers')
        ->where('status', 'open')
        ->orderBy('opened_at', 'desc')
        ->first();
    
    if ($cajaAbierta) {
        verificarCaja($cajaAbierta->id);
    } else {
        echo "⚠️  No hay ninguna caja abierta actualmente.\n\n";
        
        // Mostrar últimas cajas cerradas
        $ultimasCajas = DB::table('cash_registers')
            ->join('users', 'cash_registers.user_id', '=', 'users.id')
            ->leftJoin('branches', 'cash_registers.branch_id', '=', 'branches.id')
            ->select([
                'cash_registers.*',
                'users.username as usuario',
                'branches.name as sucursal'
            ])
            ->orderBy('opened_at', 'desc')
            ->limit(5)
            ->get();
        
        if ($ultimasCajas->count() > 0) {
            echo "📋 Últimas 5 cajas:\n";
            echo str_repeat('-', 80) . "\n";
            echo sprintf("%-6s | %-20s | %-15s | %-12s | %-10s\n", 
                "ID", "Apertura", "Usuario", "Sucursal", "Estado");
            echo str_repeat('-', 80) . "\n";
            
            foreach ($ultimasCajas as $caja) {
                $apertura = Carbon::parse($caja->opened_at)->format('d/m/Y H:i');
                echo sprintf("%-6s | %-20s | %-15s | %-12s | %-10s\n",
                    $caja->id,
                    $apertura,
                    substr($caja->usuario, 0, 15),
                    substr($caja->sucursal ?? 'N/A', 0, 12),
                    $caja->status === 'open' ? '🟢 Abierta' : '🔴 Cerrada'
                );
            }
            echo "\n";
            echo "💡 Usa: php verificar-caja.php [ID] para verificar una caja específica\n\n";
        }
    }
}

function verificarCaja(int $cajaId) {
    $caja = DB::table('cash_registers')
        ->join('users', 'cash_registers.user_id', '=', 'users.id')
        ->leftJoin('branches', 'cash_registers.branch_id', '=', 'branches.id')
        ->where('cash_registers.id', $cajaId)
        ->select([
            'cash_registers.*',
            'users.username as usuario',
            'branches.name as sucursal'
        ])
        ->first();
    
    if (!$caja) {
        echo "❌ ERROR: No se encontró la caja con ID {$cajaId}\n\n";
        exit(1);
    }
    
    // Información de la caja
    $apertura = Carbon::parse($caja->opened_at);
    $cierre = $caja->closed_at ? Carbon::parse($caja->closed_at) : null;
    $estado = $caja->status === 'open' ? '🟢 ABIERTA' : '🔴 CERRADA';
    
    echo "📦 INFORMACIÓN DE LA CAJA #{$caja->id}\n";
    echo str_repeat('-', 60) . "\n";
    echo "   Estado: {$estado}\n";
    echo "   Usuario: {$caja->usuario}\n";
    echo "   Sucursal: " . ($caja->sucursal ?? 'N/A') . "\n";
    echo "   Apertura: " . $apertura->format('d/m/Y H:i:s') . "\n";
    if ($cierre) {
        echo "   Cierre: " . $cierre->format('d/m/Y H:i:s') . "\n";
        echo "   Duración: " . $apertura->diffForHumans($cierre, true) . "\n";
    }
    echo "   Monto inicial: $" . number_format($caja->initial_amount ?? 0, 2, ',', '.') . "\n";
    echo "\n";
    
    // Obtener métodos de pago que afectan efectivo
    $metodosEfectivo = DB::table('payment_methods')
        ->where('affects_cash', true)
        ->pluck('id', 'name');
    
    echo "💵 MÉTODOS DE PAGO EN EFECTIVO:\n";
    echo str_repeat('-', 60) . "\n";
    foreach ($metodosEfectivo as $nombre => $id) {
        echo "   • {$nombre} (ID: {$id})\n";
    }
    echo "\n";
    
    // ========== CÁLCULO DE ENTRADAS ==========
    echo "📥 ENTRADAS DE EFECTIVO:\n";
    echo str_repeat('-', 60) . "\n";
    
    // 1. Ventas en efectivo
    $ventasEfectivo = DB::table('sale_payments')
        ->join('sales_header', 'sale_payments.sale_header_id', '=', 'sales_header.id')
        ->join('cash_movements', function($join) {
            $join->on('cash_movements.reference_id', '=', 'sales_header.id')
                 ->where('cash_movements.reference_type', '=', 'App\\Models\\SaleHeader');
        })
        ->where('cash_movements.cash_register_id', $cajaId)
        ->whereIn('sale_payments.payment_method_id', $metodosEfectivo->values())
        ->whereNull('sales_header.deleted_at')
        ->sum('sale_payments.amount');
    
    // Si no hay movimientos de caja relacionados, buscar directamente en sales
    if ($ventasEfectivo == 0) {
        $ventasEfectivo = DB::table('sale_payments')
            ->join('sales_header', 'sale_payments.sale_header_id', '=', 'sales_header.id')
            ->whereIn('sale_payments.payment_method_id', $metodosEfectivo->values())
            ->whereNull('sales_header.deleted_at')
            ->where('sales_header.date', '>=', $caja->opened_at)
            ->when($caja->closed_at, function($q) use ($caja) {
                return $q->where('sales_header.date', '<=', $caja->closed_at);
            })
            ->sum('sale_payments.amount');
    }
    
    echo "   Ventas en efectivo: $" . number_format($ventasEfectivo, 2, ',', '.') . "\n";
    
    // 2. Otros ingresos de caja (entradas manuales)
    $entradaManuales = DB::table('cash_movements')
        ->join('movement_types', 'cash_movements.movement_type_id', '=', 'movement_types.id')
        ->where('cash_movements.cash_register_id', $cajaId)
        ->where('movement_types.operation_type', 'entrada')
        ->where('movement_types.is_cash_movement', true)
        ->where(function($q) use ($metodosEfectivo) {
            $q->whereIn('cash_movements.payment_method_id', $metodosEfectivo->values())
              ->orWhereNull('cash_movements.payment_method_id');
        })
        ->whereNull('cash_movements.reference_type') // Solo manuales
        ->sum('cash_movements.amount');
    
    echo "   Entradas manuales: $" . number_format($entradaManuales, 2, ',', '.') . "\n";
    
    // 3. Cobros de cuenta corriente en efectivo
    $cobrosCC = DB::table('cash_movements')
        ->join('movement_types', 'cash_movements.movement_type_id', '=', 'movement_types.id')
        ->where('cash_movements.cash_register_id', $cajaId)
        ->where('movement_types.operation_type', 'entrada')
        ->where('cash_movements.reference_type', 'App\\Models\\CurrentAccountMovement')
        ->where(function($q) use ($metodosEfectivo) {
            $q->whereIn('cash_movements.payment_method_id', $metodosEfectivo->values())
              ->orWhereNull('cash_movements.payment_method_id');
        })
        ->sum('cash_movements.amount');
    
    echo "   Cobros cuenta corriente: $" . number_format($cobrosCC, 2, ',', '.') . "\n";
    
    $totalEntradas = $ventasEfectivo + $entradaManuales + $cobrosCC;
    echo "   ─────────────────────────────────────\n";
    echo "   TOTAL ENTRADAS: $" . number_format($totalEntradas, 2, ',', '.') . "\n";
    echo "\n";
    
    // ========== CÁLCULO DE SALIDAS ==========
    echo "📤 SALIDAS DE EFECTIVO:\n";
    echo str_repeat('-', 60) . "\n";
    
    // 1. Gastos/Egresos
    $gastos = DB::table('cash_movements')
        ->join('movement_types', 'cash_movements.movement_type_id', '=', 'movement_types.id')
        ->where('cash_movements.cash_register_id', $cajaId)
        ->where('movement_types.operation_type', 'salida')
        ->where('movement_types.is_cash_movement', true)
        ->where(function($q) use ($metodosEfectivo) {
            $q->whereIn('cash_movements.payment_method_id', $metodosEfectivo->values())
              ->orWhereNull('cash_movements.payment_method_id');
        })
        ->sum('cash_movements.amount');
    
    echo "   Gastos/Egresos: $" . number_format($gastos, 2, ',', '.') . "\n";
    
    // Detallar gastos
    $detalleGastos = DB::table('cash_movements')
        ->join('movement_types', 'cash_movements.movement_type_id', '=', 'movement_types.id')
        ->where('cash_movements.cash_register_id', $cajaId)
        ->where('movement_types.operation_type', 'salida')
        ->where('movement_types.is_cash_movement', true)
        ->select([
            'cash_movements.amount',
            'cash_movements.description',
            'movement_types.name as tipo',
            'cash_movements.created_at'
        ])
        ->orderBy('cash_movements.created_at', 'asc')
        ->get();
    
    if ($detalleGastos->count() > 0) {
        echo "\n   Detalle de salidas:\n";
        foreach ($detalleGastos as $gasto) {
            $fecha = Carbon::parse($gasto->created_at)->format('d/m H:i');
            echo sprintf("      • %s - $%s - %s\n", 
                $fecha,
                number_format($gasto->amount, 2, ',', '.'),
                substr($gasto->description ?? $gasto->tipo, 0, 35)
            );
        }
    }
    
    $totalSalidas = $gastos;
    echo "   ─────────────────────────────────────\n";
    echo "   TOTAL SALIDAS: $" . number_format($totalSalidas, 2, ',', '.') . "\n";
    echo "\n";
    
    // ========== BALANCE ESPERADO ==========
    $montoInicial = (float)$caja->initial_amount;
    $balanceEsperado = $montoInicial + $totalEntradas - $totalSalidas;
    
    echo "💰 CÁLCULO DEL BALANCE:\n";
    echo str_repeat('-', 60) . "\n";
    echo "   Monto inicial:        $" . number_format($montoInicial, 2, ',', '.') . "\n";
    echo "   + Entradas:           $" . number_format($totalEntradas, 2, ',', '.') . "\n";
    echo "   - Salidas:            $" . number_format($totalSalidas, 2, ',', '.') . "\n";
    echo "   ─────────────────────────────────────\n";
    echo "   EFECTIVO ESPERADO:    $" . number_format($balanceEsperado, 2, ',', '.') . "\n";
    echo "\n";
    
    // ========== COMPARACIÓN CON VALORES GUARDADOS ==========
    if ($caja->status === 'closed' && $caja->final_amount !== null) {
        $montoFinal = (float)$caja->final_amount;
        $diferenciaReal = $montoFinal - $balanceEsperado;
        $diferenciaGuardada = (float)($caja->cash_difference ?? 0);
        
        echo "📊 RESULTADO DEL ARQUEO:\n";
        echo str_repeat('-', 60) . "\n";
        echo "   Efectivo contado (cierre):    $" . number_format($montoFinal, 2, ',', '.') . "\n";
        echo "   Efectivo esperado (cálculo):  $" . number_format($balanceEsperado, 2, ',', '.') . "\n";
        echo "   ─────────────────────────────────────\n";
        
        if (abs($diferenciaReal) < 0.01) {
            echo "   ✅ DIFERENCIA: $0,00 - LA CAJA CUADRA PERFECTAMENTE\n";
        } elseif ($diferenciaReal > 0) {
            echo "   ⚠️  SOBRANTE: $" . number_format($diferenciaReal, 2, ',', '.') . "\n";
        } else {
            echo "   ❌ FALTANTE: $" . number_format(abs($diferenciaReal), 2, ',', '.') . "\n";
        }
        
        if (abs($diferenciaGuardada - $diferenciaReal) > 0.01) {
            echo "\n   ⚠️  NOTA: La diferencia guardada ($" . number_format($diferenciaGuardada, 2, ',', '.') . 
                 ") difiere del cálculo actual.\n";
        }
    } else {
        echo "📊 ESTADO ACTUAL (Caja abierta):\n";
        echo str_repeat('-', 60) . "\n";
        echo "   Deberías tener en efectivo: $" . number_format($balanceEsperado, 2, ',', '.') . "\n";
        echo "\n";
        echo "   💡 Contá el efectivo físico y compará con este valor.\n";
    }
    
    echo "\n";
    
    // ========== DETALLE DE MOVIMIENTOS ==========
    echo "📋 RESUMEN DE MOVIMIENTOS POR TIPO:\n";
    echo str_repeat('-', 60) . "\n";
    
    $movimientosPorTipo = DB::table('cash_movements')
        ->join('movement_types', 'cash_movements.movement_type_id', '=', 'movement_types.id')
        ->where('cash_movements.cash_register_id', $cajaId)
        ->select([
            'movement_types.name',
            'movement_types.operation_type',
            DB::raw('COUNT(*) as cantidad'),
            DB::raw('SUM(cash_movements.amount) as total')
        ])
        ->groupBy('movement_types.id', 'movement_types.name', 'movement_types.operation_type')
        ->orderBy('movement_types.operation_type')
        ->get();
    
    foreach ($movimientosPorTipo as $mov) {
        $signo = $mov->operation_type === 'entrada' ? '+' : '-';
        $icon = $mov->operation_type === 'entrada' ? '📥' : '📤';
        echo sprintf("   %s %s: %d mov. | %s$%s\n",
            $icon,
            str_pad($mov->name, 25),
            $mov->cantidad,
            $signo,
            number_format($mov->total, 2, ',', '.')
        );
    }
    
    echo "\n";
    echo "═══════════════════════════════════════════════════════════════════\n";
    echo "   Verificación finalizada: " . now()->format('d/m/Y H:i:s') . "\n";
    echo "═══════════════════════════════════════════════════════════════════\n\n";
}

function verificarTodasLasCajas() {
    echo "📋 CAJAS CON DIFERENCIAS (últimos 30 días):\n";
    echo str_repeat('-', 100) . "\n";
    
    $fechaLimite = Carbon::now()->subDays(30);
    
    $cajas = DB::table('cash_registers')
        ->join('users', 'cash_registers.user_id', '=', 'users.id')
        ->leftJoin('branches', 'cash_registers.branch_id', '=', 'branches.id')
        ->where('cash_registers.status', 'closed')
        ->where('cash_registers.opened_at', '>=', $fechaLimite)
        ->whereNotNull('cash_registers.cash_difference')
        ->where('cash_registers.cash_difference', '!=', 0)
        ->select([
            'cash_registers.*',
            'users.username as usuario',
            'branches.name as sucursal'
        ])
        ->orderBy('cash_registers.opened_at', 'desc')
        ->get();
    
    if ($cajas->count() === 0) {
        echo "✅ No hay cajas con diferencias en los últimos 30 días.\n\n";
        return;
    }
    
    echo sprintf("%-6s | %-15s | %-15s | %-12s | %-12s | %-12s | %-10s\n",
        "ID", "Fecha", "Usuario", "Inicial", "Final", "Diferencia", "Estado");
    echo str_repeat('-', 100) . "\n";
    
    $totalDiferencias = 0;
    
    foreach ($cajas as $caja) {
        $fecha = Carbon::parse($caja->opened_at)->format('d/m/Y');
        $diferencia = (float)$caja->cash_difference;
        $totalDiferencias += $diferencia;
        
        $estadoDif = $diferencia > 0 ? '⬆️ Sobrante' : '⬇️ Faltante';
        
        echo sprintf("%-6s | %-15s | %-15s | $%-10s | $%-10s | $%-10s | %-10s\n",
            $caja->id,
            $fecha,
            substr($caja->usuario, 0, 15),
            number_format($caja->initial_amount, 2, ',', '.'),
            number_format($caja->final_amount, 2, ',', '.'),
            number_format($diferencia, 2, ',', '.'),
            $estadoDif
        );
    }
    
    echo str_repeat('-', 100) . "\n";
    echo sprintf("TOTAL DIFERENCIAS: $%s\n", number_format($totalDiferencias, 2, ',', '.'));
    echo "\n";
    echo "💡 Usa: php verificar-caja.php [ID] para ver el detalle de una caja específica\n\n";
}
