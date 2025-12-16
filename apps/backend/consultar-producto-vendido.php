<?php
/**
 * Script para consultar cuántas veces y cuándo se vendió un producto específico
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
echo "   CONSULTA DE VENTAS POR PRODUCTO - CÓDIGO: {$codigoProducto}\n";
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
echo "   Precio de venta: $" . number_format($producto->sale_price ?? 0, 2, ',', '.') . "\n";
echo "\n";

// Consultar ventas del producto
$ventas = DB::table('sale_items')
    ->join('sales_header', 'sale_items.sale_header_id', '=', 'sales_header.id')
    ->leftJoin('customers', 'sales_header.customer_id', '=', 'customers.id')
    ->leftJoin('people', 'customers.person_id', '=', 'people.id')
    ->leftJoin('users', 'sales_header.user_id', '=', 'users.id')
    ->where('sale_items.product_id', $producto->id)
    ->whereNull('sales_header.deleted_at')
    ->select([
        'sales_header.id as venta_id',
        'sales_header.date',
        'sales_header.receipt_number',
        'sale_items.quantity',
        'sale_items.unit_price',
        'sale_items.item_total',
        DB::raw("CONCAT(COALESCE(people.first_name, ''), ' ', COALESCE(people.last_name, '')) as cliente"),
        'users.username as vendedor',
        'sales_header.status',
    ])
    ->orderBy('sales_header.date', 'desc')
    ->get();

if ($ventas->count() === 0) {
    echo "⚠️  Este producto no tiene registros de venta.\n\n";
    exit(0);
}

// Estadísticas
$totalVeces = $ventas->count();
$cantidadTotal = $ventas->sum('quantity');
$montoTotal = $ventas->sum('item_total');

echo "📊 RESUMEN DE VENTAS:\n";
echo str_repeat('-', 60) . "\n";
echo "   Cantidad de ventas: {$totalVeces}\n";
echo "   Unidades vendidas: " . number_format($cantidadTotal, 2, ',', '.') . "\n";
echo "   Monto total vendido: $" . number_format($montoTotal, 2, ',', '.') . "\n";
echo "\n";

// Estadísticas por mes
echo "📅 VENTAS POR MES:\n";
echo str_repeat('-', 60) . "\n";

$ventasPorMes = DB::table('sale_items')
    ->join('sales_header', 'sale_items.sale_header_id', '=', 'sales_header.id')
    ->where('sale_items.product_id', $producto->id)
    ->whereNull('sales_header.deleted_at')
    ->select(
        DB::raw("DATE_FORMAT(sales_header.date, '%Y-%m') as mes"),
        DB::raw('COUNT(*) as cantidad_ventas'),
        DB::raw('SUM(sale_items.quantity) as unidades'),
        DB::raw('SUM(sale_items.item_total) as total')
    )
    ->groupBy('mes')
    ->orderBy('mes', 'desc')
    ->limit(12)
    ->get();

foreach ($ventasPorMes as $mes) {
    $mesFormateado = \Carbon\Carbon::createFromFormat('Y-m', $mes->mes)->format('M Y');
    echo sprintf(
        "   %s: %d ventas | %.2f unidades | $%s\n",
        str_pad($mesFormateado, 10),
        $mes->cantidad_ventas,
        $mes->unidades,
        number_format($mes->total, 2, ',', '.')
    );
}
echo "\n";

// Detalle de las últimas ventas
echo "📋 DETALLE DE VENTAS (últimas 50):\n";
echo str_repeat('-', 90) . "\n";
echo sprintf(
    "%-6s | %-19s | %-12s | %-8s | %-10s | %-20s\n",
    "ID", "Fecha", "Comprobante", "Cant.", "Total", "Cliente"
);
echo str_repeat('-', 90) . "\n";

$ventasDetalle = $ventas->take(50);

foreach ($ventasDetalle as $venta) {
    $fecha = \Carbon\Carbon::parse($venta->date)->format('d/m/Y H:i');
    $cliente = $venta->cliente ? substr($venta->cliente, 0, 20) : 'Consumidor Final';
    $comprobante = $venta->receipt_number ?? 'N/A';
    
    echo sprintf(
        "%-6s | %-19s | %-12s | %-8s | $%-9s | %-20s\n",
        $venta->venta_id,
        $fecha,
        substr($comprobante, 0, 12),
        number_format($venta->quantity, 2),
        number_format($venta->item_total, 2, ',', '.'),
        $cliente
    );
}

if ($ventas->count() > 50) {
    echo "\n... y " . ($ventas->count() - 50) . " ventas más\n";
}

echo "\n";
echo "═══════════════════════════════════════════════════════════════════\n";
echo "   Consulta finalizada: " . now()->format('d/m/Y H:i:s') . "\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";
