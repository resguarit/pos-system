<?php
/**
 * Script para verificar el efectivo esperado en la caja abierta
 * Usa EXACTAMENTE la misma lógica que el modelo CashRegister
 * 
 * Uso: 
 *   php verificar-caja.php              # Verifica la caja abierta actual
 *   php verificar-caja.php [caja_id]    # Verifica una caja específica
 * 
 * Ejemplo: php verificar-caja.php 15
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\CashRegister;
use App\Models\PaymentMethod;
use Carbon\Carbon;

echo "\n";
echo "═══════════════════════════════════════════════════════════════════\n";
echo "          VERIFICACIÓN DE CAJA - CONTROL DE EFECTIVO\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";

// Determinar qué caja verificar
$param = $argv[1] ?? null;

if ($param !== null && is_numeric($param)) {
    $caja = CashRegister::with(['cashMovements.movementType', 'cashMovements.paymentMethod', 'user', 'branch'])->find((int)$param);
    if (!$caja) {
        echo "❌ ERROR: No se encontró la caja con ID {$param}\n\n";
        exit(1);
    }
} else {
    // Buscar caja abierta
    $caja = CashRegister::with(['cashMovements.movementType', 'cashMovements.paymentMethod', 'user', 'branch'])
        ->where('status', 'open')
        ->orderBy('opened_at', 'desc')
        ->first();
    
    if (!$caja) {
        echo "⚠️  No hay ninguna caja abierta actualmente.\n\n";
        
        // Mostrar últimas cajas
        $ultimasCajas = CashRegister::with('user')
            ->orderBy('opened_at', 'desc')
            ->limit(5)
            ->get();
        
        if ($ultimasCajas->count() > 0) {
            echo "📋 Últimas 5 cajas:\n";
            echo str_repeat('-', 70) . "\n";
            foreach ($ultimasCajas as $c) {
                $estado = $c->status === 'open' ? '🟢 Abierta' : '🔴 Cerrada';
                echo sprintf("   ID: %d | %s | %s | %s\n",
                    $c->id,
                    Carbon::parse($c->opened_at)->format('d/m/Y H:i'),
                    $c->user->username ?? 'N/A',
                    $estado
                );
            }
            echo "\n💡 Usa: php verificar-caja.php [ID] para verificar una caja específica\n\n";
        }
        exit(0);
    }
}

// Información de la caja
$apertura = Carbon::parse($caja->opened_at);
$estado = $caja->status === 'open' ? '🟢 ABIERTA' : '🔴 CERRADA';

echo "📦 INFORMACIÓN DE LA CAJA #{$caja->id}\n";
echo str_repeat('-', 60) . "\n";
echo "   Estado: {$estado}\n";
echo "   Usuario: " . ($caja->user->username ?? 'N/A') . "\n";
echo "   Sucursal: " . ($caja->branch->description ?? 'N/A') . "\n";
echo "   Apertura: " . $apertura->format('d/m/Y H:i:s') . "\n";
if ($caja->closed_at) {
    echo "   Cierre: " . Carbon::parse($caja->closed_at)->format('d/m/Y H:i:s') . "\n";
}
echo "   Monto inicial: $" . number_format($caja->initial_amount ?? 0, 2, ',', '.') . "\n";
echo "\n";

// Obtener métodos de pago que son efectivo (MISMA LÓGICA QUE EL MODELO)
$cashKeywords = ['efectivo', 'cash', 'contado'];
$cashPaymentMethods = PaymentMethod::where('is_active', true)
    ->where(function ($query) use ($cashKeywords) {
        foreach ($cashKeywords as $keyword) {
            $query->orWhere('name', 'LIKE', "%{$keyword}%");
        }
    })
    ->get();

$cashPaymentMethodIds = $cashPaymentMethods->pluck('id')->toArray();

echo "💵 MÉTODOS DE PAGO DETECTADOS COMO EFECTIVO:\n";
echo str_repeat('-', 60) . "\n";
if ($cashPaymentMethods->isEmpty()) {
    echo "   ⚠️  No se encontraron métodos de pago de efectivo\n";
} else {
    foreach ($cashPaymentMethods as $pm) {
        echo "   • {$pm->name} (ID: {$pm->id})\n";
    }
}
echo "\n";

// CALCULAR USANDO LA MISMA LÓGICA QUE updateCalculatedFields()
$movements = $caja->cashMovements;
$paymentTotals = [];
$expectedCash = (float)$caja->initial_amount;

$movimientosDetalle = [];

foreach ($movements as $movement) {
    // CRÍTICO: Solo procesar movimientos que afectan el balance
    if (!$movement->affects_balance) {
        continue;
    }
    
    // Excluir movimientos automáticos del sistema
    $movementTypeName = $movement->movementType->name ?? '';
    if (in_array($movementTypeName, ['Apertura automática', 'Cierre automático', 'Ajuste del sistema'])) {
        continue;
    }
    
    // Determinar si es entrada o salida
    $operationType = $movement->movementType->operation_type ?? 'entrada';
    $amount = ($operationType === 'entrada') ? $movement->amount : -$movement->amount;
    
    // Nombre del método de pago
    $paymentMethodName = $movement->paymentMethod->name ?? 'Indefinido';
    $paymentMethodId = $movement->payment_method_id;
    
    // Acumular por método de pago
    if (!isset($paymentTotals[$paymentMethodName])) {
        $paymentTotals[$paymentMethodName] = 0;
    }
    $paymentTotals[$paymentMethodName] += $amount;
    
    // Verificar si es efectivo (MISMA LÓGICA QUE EL MODELO)
    $isCashPayment = false;
    if ($paymentMethodId && in_array($paymentMethodId, $cashPaymentMethodIds)) {
        $isCashPayment = true;
    } elseif (!$paymentMethodId && in_array(strtolower($paymentMethodName), ['efectivo', 'cash', 'contado'])) {
        $isCashPayment = true;
    } elseif ($paymentMethodId === null) {
        $isCashPayment = true;
    }
    
    if ($isCashPayment) {
        $expectedCash += $amount;
    }
    
    // Guardar para detalle
    $movimientosDetalle[] = [
        'id' => $movement->id,
        'tipo' => $movementTypeName,
        'operacion' => $operationType,
        'metodo_pago' => $paymentMethodName,
        'monto' => $movement->amount,
        'es_efectivo' => $isCashPayment,
        'descripcion' => $movement->description,
        'fecha' => $movement->created_at,
    ];
}

// Mostrar totales por método de pago
echo "💳 TOTALES POR MÉTODO DE PAGO:\n";
echo str_repeat('-', 60) . "\n";
foreach ($paymentTotals as $metodo => $total) {
    $signo = $total >= 0 ? '+' : '';
    $esCash = in_array($metodo, $cashPaymentMethods->pluck('name')->toArray()) || $metodo === 'Indefinido';
    $icono = $esCash ? '💵' : '💳';
    echo sprintf("   %s %s: %s$%s\n",
        $icono,
        str_pad($metodo, 20),
        $signo,
        number_format($total, 2, ',', '.')
    );
}
echo "\n";

// RESULTADO PRINCIPAL
echo "═══════════════════════════════════════════════════════════════════\n";
echo "                    💰 CÁLCULO DE EFECTIVO ESPERADO\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";

echo "   Monto inicial:                    $" . number_format($caja->initial_amount, 2, ',', '.') . "\n";

$movimientosEfectivo = $expectedCash - $caja->initial_amount;
$signoMov = $movimientosEfectivo >= 0 ? '+' : '';
echo "   Movimientos en efectivo:          {$signoMov}$" . number_format($movimientosEfectivo, 2, ',', '.') . "\n";
echo "   ─────────────────────────────────────────────────────\n";
echo "   EFECTIVO ESPERADO (calculado):    $" . number_format($expectedCash, 2, ',', '.') . "\n\n";

// Comparar con el valor guardado en la BD
$valorGuardadoBD = (float)($caja->expected_cash_balance ?? 0);
echo "   Valor guardado en BD:             $" . number_format($valorGuardadoBD, 2, ',', '.') . "\n";

$diferencia = abs($expectedCash - $valorGuardadoBD);
if ($diferencia < 0.01) {
    echo "\n   ✅ EL CÁLCULO COINCIDE CON LO GUARDADO EN LA BD\n";
} else {
    echo "\n   ⚠️  HAY UNA DIFERENCIA DE: $" . number_format($diferencia, 2, ',', '.') . "\n";
    echo "   (El valor en la BD puede estar desactualizado)\n";
}

echo "\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";

// Mostrar detalle de movimientos de efectivo
echo "📋 DETALLE DE MOVIMIENTOS QUE AFECTAN EFECTIVO:\n";
echo str_repeat('-', 100) . "\n";
echo sprintf("%-6s | %-16s | %-20s | %-15s | %-10s | %-10s\n",
    "ID", "Fecha", "Tipo", "Método Pago", "Monto", "Efectivo?");
echo str_repeat('-', 100) . "\n";

$movimientosEfectivoDetalle = array_filter($movimientosDetalle, fn($m) => $m['es_efectivo']);
usort($movimientosEfectivoDetalle, fn($a, $b) => $a['fecha'] <=> $b['fecha']);

foreach ($movimientosEfectivoDetalle as $mov) {
    $fecha = Carbon::parse($mov['fecha'])->format('d/m H:i');
    $signo = $mov['operacion'] === 'entrada' ? '+' : '-';
    echo sprintf("%-6s | %-16s | %-20s | %-15s | %s$%-8s | %-10s\n",
        $mov['id'],
        $fecha,
        substr($mov['tipo'], 0, 20),
        substr($mov['metodo_pago'], 0, 15),
        $signo,
        number_format($mov['monto'], 2, ',', '.'),
        $mov['es_efectivo'] ? '✅ Sí' : '❌ No'
    );
}

$totalMovimientos = count($movimientosDetalle);
$movimientosNoEfectivo = count(array_filter($movimientosDetalle, fn($m) => !$m['es_efectivo']));
if ($movimientosNoEfectivo > 0) {
    echo "\n📋 MOVIMIENTOS QUE NO AFECTAN EFECTIVO ({$movimientosNoEfectivo}):\n";
    echo str_repeat('-', 100) . "\n";
    
    $movimientosOtros = array_filter($movimientosDetalle, fn($m) => !$m['es_efectivo']);
    foreach ($movimientosOtros as $mov) {
        $fecha = Carbon::parse($mov['fecha'])->format('d/m H:i');
        $signo = $mov['operacion'] === 'entrada' ? '+' : '-';
        echo sprintf("%-6s | %-16s | %-20s | %-15s | %s$%-8s\n",
            $mov['id'],
            $fecha,
            substr($mov['tipo'], 0, 20),
            substr($mov['metodo_pago'], 0, 15),
            $signo,
            number_format($mov['monto'], 2, ',', '.')
        );
    }
}

echo "\n";
echo "═══════════════════════════════════════════════════════════════════\n";
echo "   Verificación finalizada: " . now()->format('d/m/Y H:i:s') . "\n";
echo "   Total movimientos procesados: {$totalMovimientos}\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";
