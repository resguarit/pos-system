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
DRY_RUN="true"
if [[ "${1:-}" == "--execute" ]]; then
    DRY_RUN="false"
    echo "⚠️  MODO: EJECUCIÓN REAL"
else
    echo "🔍 MODO: DRY RUN (simulación)"
    echo "   Para ejecutar realmente: $0 --execute"
fi
echo ""

cd "$BACKEND_DIR"

# Ejecutar todo el script en un solo bloque PHP para evitar problemas
php artisan tinker <<EOF
\$PURCHASE_ORDER_ID = $PURCHASE_ORDER_ID;
\$DRY_RUN = $DRY_RUN;

echo "==============================================\n";
echo "PASO 1: Verificar la orden de compra\n";
echo "==============================================\n";

\$order = App\Models\PurchaseOrder::with(['supplier', 'branch', 'items.product'])->find(\$PURCHASE_ORDER_ID);

if (!\$order) {
    echo "❌ ERROR: Orden de compra #{\$PURCHASE_ORDER_ID} no encontrada\n";
    exit(1);
}

echo "✅ Orden encontrada:\n";
echo "   - ID: {\$order->id}\n";
echo "   - Status: {\$order->status}\n";
echo "   - Fecha: {\$order->order_date}\n";
echo "   - Proveedor: " . (\$order->supplier ? \$order->supplier->name : 'N/A') . "\n";
echo "   - Sucursal: " . (\$order->branch ? \$order->branch->name : 'N/A') . "\n";
echo "   - Total: \${\$order->total_amount} {\$order->currency}\n";
echo "   - Afecta Caja: " . (\$order->affects_cash_register ? 'Sí' : 'No') . "\n";
echo "   - Items: " . \$order->items->count() . "\n";

echo "\n==============================================\n";
echo "PASO 2: Items y stock a revertir\n";
echo "==============================================\n";

\$stockChanges = [];
foreach (\$order->items as \$item) {
    \$product = \$item->product;
    \$productName = \$product ? \$product->description : "Producto #{\$item->product_id}";
    
    \$stock = App\Models\Stock::where('product_id', \$item->product_id)
        ->where('branch_id', \$order->branch_id)
        ->first();
    
    echo "📦 {\$productName}\n";
    echo "   Cantidad en orden: {\$item->quantity}\n";
    
    if (\$stock) {
        \$newStock = \$stock->current_stock - \$item->quantity;
        echo "   Stock actual: {\$stock->current_stock}\n";
        echo "   Stock después de revertir: {\$newStock}";
        if (\$newStock < 0) {
            echo " ⚠️ NEGATIVO!";
        }
        echo "\n";
        
        \$stockChanges[] = [
            'stock' => \$stock,
            'product_id' => \$item->product_id,
            'old' => \$stock->current_stock,
            'new' => \$newStock,
            'quantity' => \$item->quantity,
        ];
    } else {
        echo "   ⚠️ No hay registro de stock\n";
    }
    echo "\n";
}

echo "==============================================\n";
echo "PASO 3: Movimientos de caja a eliminar\n";
echo "==============================================\n";

\$cashMovements = App\Models\CashMovement::where('reference_type', 'purchase_order')
    ->where('reference_id', \$PURCHASE_ORDER_ID)
    ->get();

if (\$cashMovements->isEmpty()) {
    echo "ℹ️ No hay movimientos de caja asociados\n";
} else {
    echo "✅ Movimientos encontrados: " . \$cashMovements->count() . "\n";
    foreach (\$cashMovements as \$m) {
        echo "   - ID: {\$m->id} | Monto: \${\$m->amount} | {\$m->description}\n";
    }
}

echo "\n==============================================\n";
echo "PASO 4: Historial de costos a eliminar\n";
echo "==============================================\n";

\$costHistories = App\Models\ProductCostHistory::where('source_type', 'purchase_order')
    ->where('source_id', \$PURCHASE_ORDER_ID)
    ->get();

if (\$costHistories->isEmpty()) {
    echo "ℹ️ No hay registros de historial de costos\n";
} else {
    echo "✅ Registros encontrados: " . \$costHistories->count() . "\n";
    foreach (\$costHistories as \$h) {
        echo "   - Producto #{\$h->product_id}: \${\$h->previous_cost} → \${\$h->new_cost}\n";
    }
}

echo "\n==============================================\n";

if (\$DRY_RUN) {
    echo "🔍 MODO DRY RUN - NO SE REALIZARON CAMBIOS\n\n";
    echo "Para ejecutar la reversión realmente:\n";
    echo "  ./scripts/revert-purchase-order-130.sh --execute\n\n";
    exit(0);
}

echo "🔴 EJECUTANDO REVERSIÓN...\n";
echo "==============================================\n";

DB::beginTransaction();
try {
    // 1. Revertir stock
    echo "📦 Revirtiendo stock...\n";
    foreach (\$stockChanges as \$change) {
        \$change['stock']->current_stock = \$change['new'];
        \$change['stock']->save();
        echo "   ✅ Producto #{\$change['product_id']}: {\$change['old']} → {\$change['new']}\n";
    }
    
    // 2. Eliminar movimientos de caja
    echo "\n💰 Eliminando movimientos de caja...\n";
    \$deletedCash = App\Models\CashMovement::where('reference_type', 'purchase_order')
        ->where('reference_id', \$PURCHASE_ORDER_ID)
        ->delete();
    echo "   ✅ {\$deletedCash} movimientos eliminados\n";
    
    // 3. Eliminar historial de costos
    echo "\n📊 Eliminando historial de costos...\n";
    \$deletedHistory = App\Models\ProductCostHistory::where('source_type', 'purchase_order')
        ->where('source_id', \$PURCHASE_ORDER_ID)
        ->delete();
    echo "   ✅ {\$deletedHistory} registros eliminados\n";
    
    // 4. Cambiar status de la orden
    echo "\n📝 Actualizando estado de la orden...\n";
    \$currentNotes = \$order->notes ?? '';
    \$newNotes = \$currentNotes . "\n\n[REVERTIDA " . date('Y-m-d H:i:s') . "] - Script de reversión ejecutado";
    
    DB::table('purchase_orders')->where('id', \$PURCHASE_ORDER_ID)->update([
        'status' => 'cancelled',
        'notes' => \$newNotes,
        'updated_at' => now(),
    ]);
    echo "   ✅ Status cambiado a 'cancelled'\n";
    
    // 5. Registrar en activity log
    echo "\n📋 Registrando en log de auditoría...\n";
    DB::table('activity_log')->insert([
        'log_name' => 'purchase_order',
        'description' => 'Order reverted via script',
        'subject_type' => 'App\\Models\\PurchaseOrder',
        'subject_id' => \$PURCHASE_ORDER_ID,
        'properties' => json_encode([
            'action' => 'revert',
            'executed_at' => date('Y-m-d H:i:s'),
            'stock_changes' => count(\$stockChanges),
            'cash_movements_deleted' => \$deletedCash,
            'cost_histories_deleted' => \$deletedHistory,
        ]),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    echo "   ✅ Registrado en activity log\n";
    
    DB::commit();
    echo "\n✅ REVERSIÓN COMPLETADA EXITOSAMENTE\n";
    
} catch (Exception \$e) {
    DB::rollBack();
    echo "❌ ERROR: " . \$e->getMessage() . "\n";
    echo "Todos los cambios han sido revertidos (rollback)\n";
    exit(1);
}
EOF

echo ""
echo "=============================================="
echo "✅ Proceso finalizado"
echo "=============================================="
