<?php
/**
 * Script para consultar cuántas veces y cuándo se pidió un producto en órdenes de compra
 * 
 * Uso: php consultar-producto-vendido.php [codigo_producto]
 * Ejemplo: php consultar-producto-vendido.php 234e
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

// Obtener código del producto desde argumentos o usar valor por defecto
$codigoProducto = $argv[1] ?? '234e';

echo "\n";
echo "═══════════════════════════════════════════════════════════════════\n";
echo "   CONSULTA DE ÓRDENES DE COMPRA POR PRODUCTO - CÓDIGO: {$codigoProducto}\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";

// Buscar el producto
$producto = DB::table('products')
    ->where('code', $codigoProducto)
    ->first();

if (!$producto) {
    echo "❌ ERROR: No se encontró ningún producto con código '{$codigoProducto}'\n\n";
    
    // Buscar productos similares
    $similares = DB::table('products')
        ->where('code', 'LIKE', "%{$codigoProducto}%")
        ->limit(10)
        ->get(['id', 'code', 'description']);
    
    if ($similares->count() > 0) {
        echo "📋 Productos con códigos similares:\n";
        echo str_repeat('-', 60) . "\n";
        foreach ($similares as $prod) {
            echo "   • [{$prod->code}] {$prod->description}\n";
        }
    }
    echo "\n";
    exit(1);
}

echo "📦 PRODUCTO ENCONTRADO:\n";
echo str_repeat('-', 60) . "\n";
echo "   ID: {$producto->id}\n";
echo "   Código: {$producto->code}\n";
echo "   Descripción: {$producto->description}\n";
echo "   Precio de compra: $" . number_format($producto->unit_price ?? 0, 2, ',', '.') . "\n";
echo "\n";

// Consultar órdenes de compra del producto
$ordenes = DB::table('purchase_order_items')
    ->join('purchase_orders', 'purchase_order_items.purchase_order_id', '=', 'purchase_orders.id')
    ->leftJoin('suppliers', 'purchase_orders.supplier_id', '=', 'suppliers.id')
    ->leftJoin('branches', 'purchase_orders.branch_id', '=', 'branches.id')
    ->where('purchase_order_items.product_id', $producto->id)
    ->whereNull('purchase_orders.deleted_at')
    ->select([
        'purchase_orders.id as orden_id',
        'purchase_orders.order_date',
        'purchase_orders.status',
        'purchase_orders.currency',
        'purchase_order_items.quantity',
        'purchase_order_items.purchase_price',
        'purchase_order_items.subtotal',
        'suppliers.name as proveedor',
        'branches.description as sucursal',
    ])
    ->orderBy('purchase_orders.order_date', 'desc')
    ->get();

if ($ordenes->count() === 0) {
    echo "⚠️  Este producto no tiene registros de órdenes de compra.\n\n";
    exit(0);
}

// Estadísticas
$totalVeces = $ordenes->count();
$cantidadTotal = $ordenes->sum('quantity');
$montoTotal = $ordenes->sum('subtotal');

echo "📊 RESUMEN DE COMPRAS:\n";
echo str_repeat('-', 60) . "\n";
echo "   Cantidad de órdenes: {$totalVeces}\n";
echo "   Unidades pedidas: " . number_format($cantidadTotal, 2, ',', '.') . "\n";
echo "   Monto total comprado: $" . number_format($montoTotal, 2, ',', '.') . "\n";
echo "\n";

// Estadísticas por mes
echo "📅 COMPRAS POR MES:\n";
echo str_repeat('-', 60) . "\n";

$comprasPorMes = DB::table('purchase_order_items')
    ->join('purchase_orders', 'purchase_order_items.purchase_order_id', '=', 'purchase_orders.id')
    ->where('purchase_order_items.product_id', $producto->id)
    ->whereNull('purchase_orders.deleted_at')
    ->select(
        DB::raw("DATE_FORMAT(purchase_orders.order_date, '%Y-%m') as mes"),
        DB::raw('COUNT(DISTINCT purchase_orders.id) as cantidad_ordenes'),
        DB::raw('SUM(purchase_order_items.quantity) as unidades'),
        DB::raw('SUM(purchase_order_items.subtotal) as total')
    )
    ->groupBy('mes')
    ->orderBy('mes', 'desc')
    ->limit(12)
    ->get();

foreach ($comprasPorMes as $mes) {
    $mesFormateado = \Carbon\Carbon::createFromFormat('Y-m', $mes->mes)->format('M Y');
    echo sprintf(
        "   %s: %d órdenes | %.2f unidades | $%s\n",
        str_pad($mesFormateado, 10),
        $mes->cantidad_ordenes,
        $mes->unidades,
        number_format($mes->total, 2, ',', '.')
    );
}
echo "\n";

// Estadísticas por proveedor
echo "🏭 COMPRAS POR PROVEEDOR:\n";
echo str_repeat('-', 60) . "\n";

$comprasPorProveedor = DB::table('purchase_order_items')
    ->join('purchase_orders', 'purchase_order_items.purchase_order_id', '=', 'purchase_orders.id')
    ->leftJoin('suppliers', 'purchase_orders.supplier_id', '=', 'suppliers.id')
    ->where('purchase_order_items.product_id', $producto->id)
    ->whereNull('purchase_orders.deleted_at')
    ->select(
        'suppliers.name as proveedor',
        DB::raw('COUNT(DISTINCT purchase_orders.id) as cantidad_ordenes'),
        DB::raw('SUM(purchase_order_items.quantity) as unidades'),
        DB::raw('SUM(purchase_order_items.subtotal) as total'),
        DB::raw('AVG(purchase_order_items.purchase_price) as precio_promedio')
    )
    ->groupBy('suppliers.id', 'suppliers.name')
    ->orderBy('unidades', 'desc')
    ->get();

foreach ($comprasPorProveedor as $prov) {
    $nombreProv = $prov->proveedor ?? 'Sin proveedor';
    echo sprintf(
        "   %s: %d órdenes | %.2f unidades | $%s (precio prom: $%s)\n",
        str_pad(substr($nombreProv, 0, 20), 20),
        $prov->cantidad_ordenes,
        $prov->unidades,
        number_format($prov->total, 2, ',', '.'),
        number_format($prov->precio_promedio, 2, ',', '.')
    );
}
echo "\n";

// Detalle de las últimas órdenes
echo "📋 DETALLE DE ÓRDENES (últimas 50):\n";
echo str_repeat('-', 95) . "\n";
echo sprintf(
    "%-6s | %-12s | %-20s | %-8s | %-12s | %-12s | %-10s\n",
    "ID", "Fecha", "Proveedor", "Cant.", "Precio Unit", "Subtotal", "Estado"
);
echo str_repeat('-', 95) . "\n";

$ordenesDetalle = $ordenes->take(50);

foreach ($ordenesDetalle as $orden) {
    $fecha = \Carbon\Carbon::parse($orden->order_date)->format('d/m/Y');
    $proveedor = $orden->proveedor ? substr($orden->proveedor, 0, 20) : 'Sin proveedor';
    $moneda = $orden->currency ?? 'ARS';
    $estado = match($orden->status) {
        'completed', 'completada' => '✅ Completada',
        'pending', 'pendiente' => '⏳ Pendiente',
        'cancelled', 'cancelada' => '❌ Cancelada',
        'received', 'recibida' => '📦 Recibida',
        default => $orden->status ?? 'N/A'
    };
    
    echo sprintf(
        "%-6s | %-12s | %-20s | %-8s | %s%-10s | %s%-10s | %-10s\n",
        $orden->orden_id,
        $fecha,
        $proveedor,
        number_format($orden->quantity, 2),
        $moneda === 'USD' ? 'U$' : '$',
        number_format($orden->purchase_price, 2, ',', '.'),
        $moneda === 'USD' ? 'U$' : '$',
        number_format($orden->subtotal, 2, ',', '.'),
        $estado
    );
}

if ($ordenes->count() > 50) {
    echo "\n... y " . ($ordenes->count() - 50) . " órdenes más\n";
}

echo "\n";
echo "═══════════════════════════════════════════════════════════════════\n";
echo "   Consulta finalizada: " . now()->format('d/m/Y H:i:s') . "\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";
