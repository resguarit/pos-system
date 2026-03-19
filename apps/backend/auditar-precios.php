<?php

/**
 * SCRIPT DE AUDITORÍA DE CAMBIOS DE PRECIOS
 * ==========================================
 * Ejecutar DESDE LA RAÍZ DEL PROYECTO BACKEND con:
 *   php auditar-precios.php
 * O con Artisan Tinker:
 *   php artisan tinker < auditar-precios.php
 *
 * Muestra un reporte en consola de todos los cambios de precios
 * registrados en product_cost_histories y activity_log.
 */

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// ─────────────────────────────────────────────────────────────────────────
// CONFIGURAR RANGO DE FECHAS (ajustar según el incidente)
// ─────────────────────────────────────────────────────────────────────────
$desde = '2026-03-01 00:00:00'; // ← Ajustar fecha de inicio
$hasta = now()->format('Y-m-d H:i:s');

// ─────────────────────────────────────────────────────────────────────────
// CÓDIGOS DE PRODUCTOS AFECTADOS (del caso reportado)
// ─────────────────────────────────────────────────────────────────────────
$codigosAfectados = ['50010', '7791432889068', '7791432889051'];

echo "\n";
echo "=======================================================================\n";
echo "  AUDITORÍA DE CAMBIOS DE PRECIOS - POS SYSTEM\n";
echo "  Generado: " . now()->format('d/m/Y H:i:s') . "\n";
echo "  Rango: {$desde} → {$hasta}\n";
echo "=======================================================================\n\n";

// ─────────────────────────────────────────────────────────────────────────
// 1. HISTORIAL DE COSTOS — Cambios recientes
// ─────────────────────────────────────────────────────────────────────────
echo "► SECCIÓN 1: CAMBIOS DE PRECIO RECIENTES (product_cost_histories)\n";
echo str_repeat("─", 70) . "\n";

$cambios = DB::table('product_cost_histories as pch')
    ->join('products as p', 'pch.product_id', '=', 'p.id')
    ->leftJoin('users as u', 'pch.user_id', '=', 'u.id')
    ->select([
        'pch.created_at',
        'u.name as usuario',
        'u.email',
        'p.code as codigo',
        'p.description as descripcion',
        'pch.previous_cost',
        'pch.new_cost',
        'pch.source_type as origen',
        'pch.notes as notas',
    ])
    ->whereRaw('pch.new_cost != pch.previous_cost')
    ->whereBetween('pch.created_at', [$desde, $hasta])
    ->orderByDesc('pch.created_at')
    ->limit(100)
    ->get();

if ($cambios->isEmpty()) {
    echo "  No se encontraron cambios en el período.\n";
} else {
    echo sprintf(
        "  %-20s %-15s %-20s %-12s %-12s %-25s\n",
        "FECHA", "USUARIO", "CÓDIGO", "PRECIO_ANT", "PRECIO_NVO", "ORIGEN"
    );
    echo str_repeat("─", 100) . "\n";

    foreach ($cambios as $c) {
        $variacion = $c->previous_cost > 0
            ? round((($c->new_cost - $c->previous_cost) / $c->previous_cost) * 100, 1)
            : 0;
        $signo = $variacion >= 0 ? '+' : '';

        echo sprintf(
            "  %-20s %-15s %-20s %-12s %-12s %-25s (%s%s%%)\n",
            substr($c->created_at, 0, 19),
            substr($c->usuario ?? 'SISTEMA', 0, 14),
            substr($c->codigo ?? '-', 0, 19),
            number_format($c->previous_cost, 2),
            number_format($c->new_cost, 2),
            substr($c->origen ?? '-', 0, 24),
            $signo,
            $variacion
        );
    }
}

echo "\n";

// ─────────────────────────────────────────────────────────────────────────
// 2. AGRUPAR POR SESIÓN/MINUTO — Para detectar bulk updates
// ─────────────────────────────────────────────────────────────────────────
echo "► SECCIÓN 2: OPERACIONES MASIVAS (agrupadas por minuto y usuario)\n";
echo str_repeat("─", 70) . "\n";

$sesiones = DB::table('product_cost_histories as pch')
    ->join('products as p', 'pch.product_id', '=', 'p.id')
    ->leftJoin('users as u', 'pch.user_id', '=', 'u.id')
    ->selectRaw("
        DATE_FORMAT(pch.created_at, '%Y-%m-%d %H:%i') as minuto,
        u.name as usuario,
        pch.source_type as origen,
        pch.notes as operacion,
        COUNT(*) as cantidad,
        GROUP_CONCAT(DISTINCT p.code ORDER BY p.code SEPARATOR ', ') as codigos
    ")
    ->whereRaw('pch.new_cost != pch.previous_cost')
    ->whereBetween('pch.created_at', [$desde, $hasta])
    ->groupByRaw("DATE_FORMAT(pch.created_at, '%Y-%m-%d %H:%i'), u.name, pch.source_type, pch.notes")
    ->having('cantidad', '>', 1)
    ->orderByDesc('minuto')
    ->limit(20)
    ->get();

if ($sesiones->isEmpty()) {
    echo "  No se encontraron operaciones masivas.\n";
} else {
    echo "  ⚠️  POSIBLES ACTUALIZACIONES MASIVAS DETECTADAS:\n\n";
    foreach ($sesiones as $s) {
        echo "  ┌─ Fecha: {$s->minuto}\n";
        echo "  │  Usuario: " . ($s->usuario ?? 'SISTEMA') . "\n";
        echo "  │  Origen: {$s->origen}\n";
        echo "  │  Operación: {$s->operacion}\n";
        echo "  │  Productos modificados: {$s->cantidad}\n";
        echo "  └─ Códigos: " . substr($s->codigos, 0, 120) . "...\n\n";
    }
}

// ─────────────────────────────────────────────────────────────────────────
// 3. BUSCAR LOS PRODUCTOS ESPECÍFICOS DEL INCIDENTE
// ─────────────────────────────────────────────────────────────────────────
echo "\n► SECCIÓN 3: HISTORIAL DE LOS PRODUCTOS AFECTADOS\n";
echo str_repeat("─", 70) . "\n";
echo "  Productos: " . implode(', ', $codigosAfectados) . "\n\n";

$historialEspecifico = DB::table('product_cost_histories as pch')
    ->join('products as p', 'pch.product_id', '=', 'p.id')
    ->leftJoin('users as u', 'pch.user_id', '=', 'u.id')
    ->select([
        'pch.created_at',
        'u.name as usuario',
        'u.email',
        'p.code as codigo',
        'p.description as descripcion',
        'pch.previous_cost',
        'pch.new_cost',
        'pch.source_type as origen',
        'pch.notes as notas',
    ])
    ->whereIn('p.code', $codigosAfectados)
    ->orderBy('p.code')
    ->orderByDesc('pch.created_at')
    ->get();

if ($historialEspecifico->isEmpty()) {
    echo "  No se encontró historial para esos productos.\n";
    echo "  TIP: Revisar si los códigos son correctos en la tabla 'products'.\n";
    echo "  Código = columna 'code' (puede ser el barcode o el código interno)\n";
} else {
    $currentCode = null;
    foreach ($historialEspecifico as $h) {
        if ($currentCode !== $h->codigo) {
            $currentCode = $h->codigo;
            echo "\n  PRODUCTO: {$h->codigo} — {$h->descripcion}\n";
            echo "  " . str_repeat("·", 65) . "\n";
        }
        echo sprintf(
            "    %s | %-15s | $%s → $%s | %s\n",
            substr($h->created_at, 0, 19),
            substr($h->usuario ?? 'SISTEMA', 0, 14),
            number_format($h->previous_cost, 2),
            number_format($h->new_cost, 2),
            $h->origen
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. VERIFICAR EN activity_log (Spatie) para esos productos
// ─────────────────────────────────────────────────────────────────────────
echo "\n\n► SECCIÓN 4: AUDITORÍA SPATIE (activity_log)\n";
echo str_repeat("─", 70) . "\n";

$productIds = DB::table('products')
    ->whereIn('code', $codigosAfectados)
    ->pluck('id')
    ->toArray();

if (empty($productIds)) {
    echo "  No se encontraron los productos en la tabla products.\n";
} else {
    $activityLogs = DB::table('activity_log as al')
        ->leftJoin('users as u', function($j) {
            $j->on('al.causer_id', '=', 'u.id')
              ->where('al.causer_type', '=', 'App\\Models\\User');
        })
        ->leftJoin('products as p', 'al.subject_id', '=', 'p.id')
        ->select([
            'al.created_at',
            'u.name as usuario',
            'p.code as codigo',
            'al.event',
            'al.description',
            'al.properties',
        ])
        ->where('al.subject_type', 'App\\Models\\Product')
        ->whereIn('al.subject_id', $productIds)
        ->orderByDesc('al.created_at')
        ->limit(50)
        ->get();

    if ($activityLogs->isEmpty()) {
        echo "  No se encontraron registros en activity_log para esos productos.\n";
    } else {
        foreach ($activityLogs as $log) {
            $props = json_decode($log->properties, true);
            $precioAntes = $props['old']['unit_price'] ?? '-';
            $precioDespues = $props['attributes']['unit_price'] ?? '-';

            echo sprintf(
                "  %s | %-15s | %s | %-10s | $%s → $%s\n",
                substr($log->created_at, 0, 19),
                substr($log->usuario ?? 'SISTEMA', 0, 14),
                $log->codigo ?? '?',
                $log->event,
                is_numeric($precioAntes) ? number_format($precioAntes, 2) : $precioAntes,
                is_numeric($precioDespues) ? number_format($precioDespues, 2) : $precioDespues
            );
        }
    }
}

echo "\n\n=======================================================================\n";
echo "  FIN DEL REPORTE DE AUDITORÍA\n";
echo "=======================================================================\n\n";
