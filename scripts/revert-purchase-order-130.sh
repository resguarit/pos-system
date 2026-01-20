#!/bin/bash
set -euo pipefail

# =============================================================================
# Script para REVERTIR la Orden de Compra #130 - Hela Ditos
# =============================================================================
# Fecha: 2026-01-20
# 
# Este script revierte todas las consecuencias de la orden de compra #130:
# 1. Stock: Resta las cantidades que se sumaron a la sucursal
# 2. Cash Movements: Elimina el movimiento de caja asociado
# 3. Product Cost History: Elimina los registros de historial de costos
# 4. Activity Log: Registra la reversión
# 5. Purchase Order: Cambia el status a 'cancelled'
#
# USO:
#   DRY RUN (solo ver qué haría):  ./revert-purchase-order-130.sh
#   EJECUTAR REALMENTE:            ./revert-purchase-order-130.sh --execute
# =============================================================================

echo "🔄 REVERSIÓN DE ORDEN DE COMPRA #130 - HELA DITOS"
echo "=================================================="
echo "Fecha de ejecución: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Configuración
PURCHASE_ORDER_ID=130
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../apps/backend"

# Verificar si es ejecución real o dry run
DRY_RUN=true
if [[ "${1:-}" == "--execute" ]]; then
    DRY_RUN=false
    echo "⚠️  MODO: EJECUCIÓN REAL"
else
    echo "🔍 MODO: DRY RUN (simulación)"
    echo "   Para ejecutar realmente: $0 --execute"
fi
echo ""

# Función para ejecutar queries MySQL
run_query() {
    local query="$1"
    local description="${2:-}"
    
    if [[ -n "$description" ]]; then
        echo "📋 $description"
    fi
    
    # Ejecutar con php artisan tinker para usar la conexión de Laravel
    cd "$BACKEND_DIR"
    php artisan tinker --execute="DB::select(DB::raw(\"$query\"));" 2>/dev/null || \
    php artisan tinker --execute="print_r(DB::select(DB::raw(\"$query\")));"
}

# Función para ejecutar updates/deletes
run_statement() {
    local query="$1"
    local description="${2:-}"
    
    if [[ -n "$description" ]]; then
        echo "   $description"
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "   [DRY RUN] Query: $query"
        return 0
    fi
    
    cd "$BACKEND_DIR"
    php artisan tinker --execute="DB::statement(\"$query\");" 2>/dev/null
}

echo "=============================================="
echo "PASO 1: Verificar la orden de compra"
echo "=============================================="

cd "$BACKEND_DIR"
ORDER_INFO=$(php artisan tinker --execute="
\$order = App\Models\PurchaseOrder::with(['supplier', 'branch', 'items'])->find($PURCHASE_ORDER_ID);
if (\$order) {
    echo 'ID: ' . \$order->id . PHP_EOL;
    echo 'Status: ' . \$order->status . PHP_EOL;
    echo 'Fecha: ' . \$order->order_date . PHP_EOL;
    echo 'Proveedor: ' . (\$order->supplier ? \$order->supplier->name : 'N/A') . PHP_EOL;
    echo 'Sucursal: ' . (\$order->branch ? \$order->branch->name : 'N/A') . PHP_EOL;
    echo 'Branch ID: ' . \$order->branch_id . PHP_EOL;
    echo 'Total: \$' . \$order->total_amount . ' ' . \$order->currency . PHP_EOL;
    echo 'Items: ' . \$order->items->count() . PHP_EOL;
} else {
    echo 'ERROR: Orden no encontrada';
    exit(1);
}
" 2>/dev/null)

echo "$ORDER_INFO"

# Extraer branch_id para usarlo en las queries
BRANCH_ID=$(echo "$ORDER_INFO" | grep "Branch ID:" | awk '{print $3}')

echo ""
echo "=============================================="
echo "PASO 2: Items y stock a revertir"
echo "=============================================="

php artisan tinker --execute="
\$order = App\Models\PurchaseOrder::with(['items.product'])->find($PURCHASE_ORDER_ID);
foreach (\$order->items as \$item) {
    \$product = \$item->product;
    \$stock = App\Models\Stock::where('product_id', \$item->product_id)
        ->where('branch_id', \$order->branch_id)
        ->first();
    
    echo '📦 ' . (\$product ? \$product->description : 'Producto #'.\$item->product_id) . PHP_EOL;
    echo '   Cantidad en orden: ' . \$item->quantity . PHP_EOL;
    if (\$stock) {
        \$newStock = \$stock->current_stock - \$item->quantity;
        echo '   Stock actual: ' . \$stock->current_stock . PHP_EOL;
        echo '   Stock después de revertir: ' . \$newStock . (\$newStock < 0 ? ' ⚠️ NEGATIVO!' : '') . PHP_EOL;
    } else {
        echo '   ⚠️ No hay registro de stock' . PHP_EOL;
    }
    echo PHP_EOL;
}
" 2>/dev/null

echo ""
echo "=============================================="
echo "PASO 3: Movimientos de caja a eliminar"
echo "=============================================="

php artisan tinker --execute="
\$movements = App\Models\CashMovement::where('reference_type', 'purchase_order')
    ->where('reference_id', $PURCHASE_ORDER_ID)
    ->get();

if (\$movements->isEmpty()) {
    echo 'ℹ️ No hay movimientos de caja asociados' . PHP_EOL;
} else {
    echo '✅ Movimientos encontrados: ' . \$movements->count() . PHP_EOL;
    foreach (\$movements as \$m) {
        echo '   - ID: ' . \$m->id . ' | Monto: \$' . \$m->amount . ' | ' . \$m->description . PHP_EOL;
    }
}
" 2>/dev/null

echo ""
echo "=============================================="
echo "PASO 4: Historial de costos a eliminar"
echo "=============================================="

php artisan tinker --execute="
\$histories = App\Models\ProductCostHistory::where('source_type', 'purchase_order')
    ->where('source_id', $PURCHASE_ORDER_ID)
    ->get();

if (\$histories->isEmpty()) {
    echo 'ℹ️ No hay registros de historial de costos' . PHP_EOL;
} else {
    echo '✅ Registros encontrados: ' . \$histories->count() . PHP_EOL;
    foreach (\$histories as \$h) {
        echo '   - Producto #' . \$h->product_id . ': \$' . \$h->previous_cost . ' → \$' . \$h->new_cost . PHP_EOL;
    }
}
" 2>/dev/null

echo ""
echo "=============================================="

if [[ "$DRY_RUN" == true ]]; then
    echo "🔍 MODO DRY RUN - NO SE REALIZARON CAMBIOS"
    echo ""
    echo "Para ejecutar la reversión realmente:"
    echo "  $0 --execute"
    echo ""
    exit 0
fi

echo "🔴 EJECUTANDO REVERSIÓN..."
echo "=============================================="

# Ejecutar la reversión dentro de una transacción
php artisan tinker --execute="
DB::beginTransaction();
try {
    \$order = App\Models\PurchaseOrder::with(['items'])->find($PURCHASE_ORDER_ID);
    
    // 1. Revertir stock
    echo '📦 Revirtiendo stock...' . PHP_EOL;
    foreach (\$order->items as \$item) {
        \$stock = App\Models\Stock::where('product_id', \$item->product_id)
            ->where('branch_id', \$order->branch_id)
            ->first();
        if (\$stock) {
            \$oldStock = \$stock->current_stock;
            \$stock->current_stock -= \$item->quantity;
            \$stock->save();
            echo '   ✅ Producto #' . \$item->product_id . ': ' . \$oldStock . ' → ' . \$stock->current_stock . PHP_EOL;
        }
    }
    
    // 2. Eliminar movimientos de caja
    echo PHP_EOL . '💰 Eliminando movimientos de caja...' . PHP_EOL;
    \$deleted = App\Models\CashMovement::where('reference_type', 'purchase_order')
        ->where('reference_id', $PURCHASE_ORDER_ID)
        ->delete();
    echo '   ✅ ' . \$deleted . ' movimientos eliminados' . PHP_EOL;
    
    // 3. Eliminar historial de costos
    echo PHP_EOL . '📊 Eliminando historial de costos...' . PHP_EOL;
    \$deleted = App\Models\ProductCostHistory::where('source_type', 'purchase_order')
        ->where('source_id', $PURCHASE_ORDER_ID)
        ->delete();
    echo '   ✅ ' . \$deleted . ' registros eliminados' . PHP_EOL;
    
    // 4. Cambiar status de la orden
    echo PHP_EOL . '📝 Actualizando estado de la orden...' . PHP_EOL;
    DB::table('purchase_orders')->where('id', $PURCHASE_ORDER_ID)->update([
        'status' => 'cancelled',
        'notes' => DB::raw(\"CONCAT(COALESCE(notes, ''), '\n\n[REVERTIDA $(date '+%Y-%m-%d %H:%M:%S')] - Script de reversión ejecutado')\"),
        'updated_at' => now(),
    ]);
    echo '   ✅ Status cambiado a cancelled' . PHP_EOL;
    
    // 5. Registrar en activity log
    echo PHP_EOL . '📋 Registrando en log de auditoría...' . PHP_EOL;
    DB::table('activity_log')->insert([
        'log_name' => 'purchase_order',
        'description' => 'Order reverted via script',
        'subject_type' => 'App\\\Models\\\PurchaseOrder',
        'subject_id' => $PURCHASE_ORDER_ID,
        'properties' => json_encode(['action' => 'revert', 'executed_at' => '$(date '+%Y-%m-%d %H:%M:%S')']),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    echo '   ✅ Registrado en activity log' . PHP_EOL;
    
    DB::commit();
    echo PHP_EOL . '✅ REVERSIÓN COMPLETADA EXITOSAMENTE' . PHP_EOL;
    
} catch (Exception \$e) {
    DB::rollBack();
    echo '❌ ERROR: ' . \$e->getMessage() . PHP_EOL;
    echo 'Todos los cambios han sido revertidos (rollback)' . PHP_EOL;
    exit(1);
}
" 2>/dev/null

echo ""
echo "=============================================="
echo "✅ Proceso finalizado"
echo "=============================================="
