<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AuditProductPrices extends Command
{
    protected $signature = 'audit:product-prices
                            {--codes= : Códigos de productos separados por coma (ej: 50010,7791432889068)}
                            {--days=7  : Cuántos días hacia atrás buscar (default: 7)}
                            {--all     : Mostrar todos los cambios, no solo los de los códigos}';

    protected $description = 'Audita cambios de precios en productos usando activity_log y product_cost_histories';

    public function handle(): void
    {
        $days   = (int) $this->option('days');
        $from   = now()->subDays($days)->format('Y-m-d H:i:s');
        $until  = now()->format('Y-m-d H:i:s');
        $codes  = $this->option('codes')
            ? array_map('trim', explode(',', $this->option('codes')))
            : [];

        $this->line('');
        $this->line('<fg=cyan>════════════════════════════════════════════════</fg=cyan>');
        $this->line('<fg=cyan>  AUDITORÍA DE CAMBIOS DE PRECIOS — POS SYSTEM</fg=cyan>');
        $this->line("<fg=cyan>  Período: {$from} → {$until}</fg=cyan>");
        if ($codes) {
            $this->line('<fg=cyan>  Productos: ' . implode(', ', $codes) . '</fg=cyan>');
        }
        $this->line('<fg=cyan>════════════════════════════════════════════════</fg=cyan>');

        // ─── 1. VER HISTORIAL DE COSTOS ────────────────────────────────────
        $this->line('');
        $this->info('► SECCIÓN 1: product_cost_histories (cambios registrados)');

        $query = DB::table('product_cost_histories as pch')
            ->join('products as p', 'pch.product_id', '=', 'p.id')
            ->leftJoin('users as u', 'pch.user_id', '=', 'u.id')
            ->select([
                'pch.created_at',
                'u.name as usuario',
                'p.code as codigo',
                'p.description as descripcion',
                'p.category_id',
                'pch.previous_cost as antes',
                'pch.new_cost as nuevo',
                'pch.source_type as origen',
                'pch.notes as notas',
            ])
            ->whereRaw('pch.new_cost != pch.previous_cost')
            ->whereBetween('pch.created_at', [$from, $until])
            ->orderByDesc('pch.created_at');

        if ($codes && !$this->option('all')) {
            $query->whereIn('p.code', $codes);
        }

        $rows = $query->limit(200)->get();

        if ($rows->isEmpty()) {
            $this->warn('  Sin cambios en product_cost_histories para el período.');
        } else {
            $tableData = [];
            foreach ($rows as $r) {
                $diff = $r->antes > 0
                    ? round((($r->nuevo - $r->antes) / $r->antes) * 100, 1)
                    : 0;
                $tableData[] = [
                    substr($r->created_at, 0, 19),
                    substr($r->usuario ?? 'SISTEMA', 0, 14),
                    $r->codigo ?? '-',
                    '$' . number_format($r->antes, 2),
                    '$' . number_format($r->nuevo, 2),
                    ($diff >= 0 ? '+' : '') . $diff . '%',
                    substr($r->origen ?? '-', 0, 20),
                ];
            }
            $this->table(
                ['Fecha', 'Usuario', 'Código', 'Antes', 'Nuevo', 'Δ%', 'Origen'],
                $tableData
            );
        }

        // ─── 2. AGRUPAR POR MINUTO (detectar bulk accidentales) ───────────
        $this->line('');
        $this->info('► SECCIÓN 2: Operaciones masivas (más de 1 producto en el mismo minuto)');

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
            ->whereBetween('pch.created_at', [$from, $until])
            ->groupByRaw("DATE_FORMAT(pch.created_at, '%Y-%m-%d %H:%i'), u.name, pch.source_type, pch.notes")
            ->having('cantidad', '>', 1)
            ->orderByDesc('minuto')
            ->limit(20)
            ->get();

        if ($sesiones->isEmpty()) {
            $this->line('  No se detectaron operaciones masivas.');
        } else {
            $this->warn('  ⚠  ACTUALIZACIONES MASIVAS DETECTADAS:');
            foreach ($sesiones as $s) {
                $this->line("  ┌─ {$s->minuto} | Usuario: " . ($s->usuario ?? 'SISTEMA') . " | {$s->cantidad} productos");
                $this->line("  │  Origen: {$s->origen} — {$s->operacion}");
                $this->line("  └─ Códigos: " . substr($s->codigos ?? '', 0, 100));
                $this->line('');
            }
        }

        // ─── 3. ACTIVTY_LOG (Spatie) para los productos específicos ────────
        $this->line('');
        $this->info('► SECCIÓN 3: activity_log (Spatie) — cambios de precio');

        $productQuery = DB::table('products');
        if ($codes && !$this->option('all')) {
            $productQuery->whereIn('code', $codes);
        }
        $productIds = $productQuery->whereBetween('created_at', ['2000-01-01', $until])->pluck('id')->toArray();

        $actQuery = DB::table('activity_log as al')
            ->leftJoin('users as u', function ($j) {
                $j->on('al.causer_id', '=', 'u.id')
                  ->where('al.causer_type', '=', 'App\\Models\\User');
            })
            ->leftJoin('products as p', 'al.subject_id', '=', 'p.id')
            ->select(['al.created_at', 'u.name as usuario', 'u.email', 'p.code', 'al.event', 'al.properties'])
            ->where('al.subject_type', 'App\\Models\\Product')
            ->whereBetween('al.created_at', [$from, $until])
            ->whereIn('al.event', ['updated', 'created'])
            ->whereRaw("JSON_EXTRACT(al.properties, '$.attributes.unit_price') IS NOT NULL")
            ->orderByDesc('al.created_at');

        if ($codes && !$this->option('all') && $productIds) {
            $actQuery->whereIn('al.subject_id', $productIds);
        }

        $actLogs = $actQuery->limit(100)->get();

        if ($actLogs->isEmpty()) {
            $this->warn('  Sin registros en activity_log para esos productos y período.');
            $this->line('  TIP: Si activity_log está vacío, puede que LogsActivity no esté activo en el model Product.');
        } else {
            $tableData = [];
            foreach ($actLogs as $log) {
                $props = json_decode($log->properties, true) ?? [];
                $precioAntes  = $props['old']['unit_price'] ?? '-';
                $precioDespues = $props['attributes']['unit_price'] ?? '-';
                $tableData[] = [
                    substr($log->created_at, 0, 19),
                    substr($log->usuario ?? 'SISTEMA', 0, 14),
                    $log->email ?? '-',
                    $log->code ?? '?',
                    $log->event,
                    is_numeric($precioAntes)   ? '$' . number_format($precioAntes, 2)   : $precioAntes,
                    is_numeric($precioDespues) ? '$' . number_format($precioDespues, 2) : $precioDespues,
                ];
            }
            $this->table(
                ['Fecha', 'Usuario', 'Email', 'Código', 'Evento', 'unit_price antes', 'unit_price nuevo'],
                $tableData
            );
        }

        // ─── 4. RESUMEN POR CATEGORÍA / PROVEEDOR ──────────────────────────
        $this->line('');
        $this->info('► SECCIÓN 4: Agrupación por categoría y proveedor');

        $catStats = DB::table('product_cost_histories as pch')
            ->join('products as p', 'pch.product_id', '=', 'p.id')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->leftJoin('suppliers as s', 'p.supplier_id', '=', 's.id')
            ->selectRaw("c.name as categoria, s.name as proveedor, COUNT(DISTINCT pch.product_id) as cambios, MIN(pch.created_at) as desde, MAX(pch.created_at) as hasta")
            ->whereRaw('pch.new_cost != pch.previous_cost')
            ->whereBetween('pch.created_at', [$from, $until])
            ->groupBy('c.name', 's.name')
            ->having('cambios', '>', 0)
            ->orderByDesc('cambios')
            ->limit(20)
            ->get();

        if (!$catStats->isEmpty()) {
            $this->table(
                ['Categoría', 'Proveedor', 'Prods. modificados', 'Desde', 'Hasta'],
                $catStats->map(fn($r) => [$r->categoria ?? '-', $r->proveedor ?? '-', $r->cambios, substr($r->desde, 0, 16), substr($r->hasta, 0, 16)])->toArray()
            );
        } else {
            $this->line('  Sin datos.');
        }

        $this->line('');
        $this->line('<fg=cyan>════════════════════════════════════════════════</fg=cyan>');
        $this->line('<fg=cyan>  FIN DEL REPORTE</fg=cyan>');
        $this->line('<fg=cyan>════════════════════════════════════════════════</fg=cyan>');
        $this->line('');
    }
}
