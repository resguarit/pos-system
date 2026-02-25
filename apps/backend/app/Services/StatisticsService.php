<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SaleItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Servicio de estadísticas avanzadas de ventas.
 *
 * Responsabilidad: construir y ejecutar queries de estadísticas
 * con filtros combinables (fecha, usuario, sucursal, categoría,
 * proveedor, producto, hora).
 */
class StatisticsService
{
    /**
     * Estadísticas generales: totales con todos los filtros aplicados.
     *
     * @return array{total_sales: int, total_units: float, total_revenue: float, average_ticket: float}
     */
    public function getAdvancedStats(array $filters): array
    {
        $query = $this->baseItemQuery($filters);

        $totalUnits = (float) $query->sum('sale_items.quantity');
        $totalRevenue = (float) $query->sum('sale_items.item_total');
        $totalSales = (int) (clone $query)->distinct()->count('sale_items.sale_header_id');
        $averageTicket = $totalSales > 0 ? $totalRevenue / $totalSales : 0;

        return [
            'total_sales' => $totalSales,
            'total_units' => round($totalUnits, 2),
            'total_revenue' => round($totalRevenue, 2),
            'average_ticket' => round($averageTicket, 2),
        ];
    }

    /**
     * Ventas agrupadas por usuario.
     */
    public function getSalesByUser(array $filters): array
    {
        $query = $this->baseItemQuery($filters)
            ->join('users', 'sales_header.user_id', '=', 'users.id')
            ->join('people', 'users.person_id', '=', 'people.id')
            ->select(
                'users.id as user_id',
                DB::raw("CONCAT(people.first_name, ' ', people.last_name) as user_name"),
                DB::raw('COUNT(DISTINCT sale_items.sale_header_id) as total_sales'),
                DB::raw('SUM(sale_items.quantity) as total_units'),
                DB::raw('SUM(sale_items.item_total) as total_revenue')
            )
            ->groupBy('users.id', 'people.first_name', 'people.last_name')
            ->orderByDesc('total_revenue');

        return $query->get()->toArray();
    }

    /**
     * Ventas agrupadas por categoría de producto.
     */
    public function getSalesByCategory(array $filters): array
    {
        $query = $this->baseItemQuery($filters)
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->select(
                'categories.id as category_id',
                DB::raw("COALESCE(categories.name, 'Sin categoría') as category_name"),
                DB::raw('COUNT(DISTINCT sale_items.sale_header_id) as total_sales'),
                DB::raw('SUM(sale_items.quantity) as total_units'),
                DB::raw('SUM(sale_items.item_total) as total_revenue')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total_revenue');

        return $query->get()->toArray();
    }

    /**
     * Ventas agrupadas por proveedor.
     */
    public function getSalesBySupplier(array $filters): array
    {
        $query = $this->baseItemQuery($filters)
            ->leftJoin('suppliers', 'products.supplier_id', '=', 'suppliers.id')
            ->select(
                'suppliers.id as supplier_id',
                DB::raw("COALESCE(suppliers.name, 'Sin proveedor') as supplier_name"),
                DB::raw('COUNT(DISTINCT sale_items.sale_header_id) as total_sales'),
                DB::raw('SUM(sale_items.quantity) as total_units'),
                DB::raw('SUM(sale_items.item_total) as total_revenue')
            )
            ->groupBy('suppliers.id', 'suppliers.name')
            ->orderByDesc('total_revenue');

        return $query->get()->toArray();
    }

    /**
     * Ventas agrupadas por hora del día (0-23).
     */
    public function getSalesByHour(array $filters): array
    {
        $query = $this->baseItemQuery($filters)
            ->select(
                DB::raw('HOUR(sales_header.date) as hour'),
                DB::raw('COUNT(DISTINCT sale_items.sale_header_id) as total_sales'),
                DB::raw('SUM(sale_items.quantity) as total_units'),
                DB::raw('SUM(sale_items.item_total) as total_revenue')
            )
            ->groupBy(DB::raw('HOUR(sales_header.date)'))
            ->orderBy('hour');

        return $query->get()->toArray();
    }

    /**
     * Ventas agrupadas por método de pago.
     * Nota: usa sale_payments en vez de sale_items (relación diferente).
     */
    public function getSalesByPaymentMethod(array $filters): array
    {
        $query = DB::table('sale_payments')
            ->join('sales_header', 'sale_payments.sale_header_id', '=', 'sales_header.id')
            ->join('payment_methods', 'sale_payments.payment_method_id', '=', 'payment_methods.id')
            ->whereNull('sales_header.deleted_at')
            ->select(
                'payment_methods.id as payment_method_id',
                'payment_methods.name as payment_method_name',
                DB::raw('COUNT(DISTINCT sale_payments.sale_header_id) as total_sales'),
                DB::raw('SUM(sale_payments.amount) as total_revenue')
            )
            ->groupBy('payment_methods.id', 'payment_methods.name')
            ->orderByDesc('total_revenue');

        $this->applyHeaderOnlyFilters($query, $filters);

        return $query->get()->map(fn($row) => (array) $row)->toArray();
    }

    /**
     * Ventas agrupadas por día de la semana (1=Domingo, 7=Sábado en MySQL DAYOFWEEK).
     */
    public function getSalesByDayOfWeek(array $filters): array
    {
        $query = $this->baseItemQuery($filters)
            ->select(
                DB::raw('DAYOFWEEK(sales_header.date) as day_of_week'),
                DB::raw('COUNT(DISTINCT sale_items.sale_header_id) as total_sales'),
                DB::raw('SUM(sale_items.quantity) as total_units'),
                DB::raw('SUM(sale_items.item_total) as total_revenue')
            )
            ->groupBy(DB::raw('DAYOFWEEK(sales_header.date)'))
            ->orderBy('day_of_week');

        return $query->get()->toArray();
    }

    /**
     * Tendencia diaria de ventas.
     */
    public function getDailyTrend(array $filters): array
    {
        $query = $this->baseItemQuery($filters)
            ->select(
                DB::raw('DATE(sales_header.date) as date'),
                DB::raw('COUNT(DISTINCT sale_items.sale_header_id) as total_sales'),
                DB::raw('SUM(sale_items.quantity) as total_units'),
                DB::raw('SUM(sale_items.item_total) as total_revenue')
            )
            ->groupBy(DB::raw('DATE(sales_header.date)'))
            ->orderBy('date');

        return $query->get()->toArray();
    }

    /**
     * Top productos con todos los filtros avanzados.
     */
    public function getTopProducts(array $filters): array
    {
        $limit = $filters['limit'] ?? 20;

        $query = $this->baseItemQuery($filters)
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('suppliers', 'products.supplier_id', '=', 'suppliers.id')
            ->select(
                'products.id as product_id',
                'products.code as product_code',
                'products.description as product_name',
                DB::raw("COALESCE(categories.name, 'Sin categoría') as category_name"),
                DB::raw("COALESCE(suppliers.name, 'Sin proveedor') as supplier_name"),
                DB::raw('SUM(sale_items.quantity) as total_units'),
                DB::raw('SUM(sale_items.item_total) as total_revenue'),
                DB::raw('COUNT(DISTINCT sale_items.sale_header_id) as total_sales')
            )
            ->groupBy('products.id', 'products.code', 'products.description', 'categories.name', 'suppliers.name')
            ->orderByDesc('total_revenue')
            ->limit($limit);

        return $query->get()->toArray();
    }

    // ========================================================================
    // Query building helpers (private)
    // ========================================================================

    /**
     * Construye la query base: sale_items JOIN sales_header JOIN products.
     * Aplica los filtros avanzados comunes.
     */
    private function baseItemQuery(array $filters): Builder
    {
        $query = SaleItem::query()
            ->join('sales_header', 'sale_items.sale_header_id', '=', 'sales_header.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->whereNull('sales_header.deleted_at')
            ->whereNull('products.deleted_at');

        $this->applyAdvancedFilters($query, $filters);

        return $query;
    }

    /**
     * Aplica todos los filtros avanzados a una query que tiene sale_items + sales_header + products.
     */
    private function applyAdvancedFilters(Builder $query, array $filters): void
    {
        $this->applyHeaderOnlyFilters($query, $filters);

        if (!empty($filters['category_id'])) {
            $query->where('products.category_id', $filters['category_id']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('products.supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['product_search'])) {
            $search = $filters['product_search'];
            $query->where(function ($q) use ($search) {
                $q->where('products.description', 'LIKE', "%{$search}%")
                    ->orWhere('products.code', 'LIKE', "%{$search}%");
            });
        }
    }

    /**
     * Aplica filtros que solo dependen del encabezado de venta (sin productos).
     * Reutilizable para queries de sale_payments.
     *
     * @param Builder|\Illuminate\Database\Query\Builder $query
     */
    private function applyHeaderOnlyFilters($query, array $filters): void
    {
        if (!empty($filters['start_date'])) {
            $query->whereDate('sales_header.date', '>=', $filters['start_date']);
        }

        if (!empty($filters['end_date'])) {
            $query->whereDate('sales_header.date', '<=', $filters['end_date']);
        }

        if (!empty($filters['branch_id'])) {
            $query->where('sales_header.branch_id', $filters['branch_id']);
        }

        if (!empty($filters['user_id'])) {
            $query->where('sales_header.user_id', $filters['user_id']);
        }

        if ($filters['hour_from'] !== null) {
            $query->whereRaw('HOUR(sales_header.date) >= ?', [(int) $filters['hour_from']]);
        }

        if ($filters['hour_to'] !== null) {
            $query->whereRaw('HOUR(sales_header.date) <= ?', [(int) $filters['hour_to']]);
        }

        // Excluir ventas anuladas
        $query->where(function ($q) {
            $q->where('sales_header.status', '!=', 'annulled')
                ->orWhereNull('sales_header.status');
        });
    }
}
