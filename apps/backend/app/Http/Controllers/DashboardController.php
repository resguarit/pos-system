<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Stock;
use App\Models\SaleHeader;
use App\Models\Branch;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Obtener resumen de ventas para el dashboard
     */
    public function getSalesSummary(Request $request)
    {
        $branchIds = $request->query('branch_id', []); // Puede ser array o valor único
        $startDate = $request->query('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth());

        $query = SaleHeader::whereBetween('date', [$startDate, $endDate]);
        
        // Filtrar por sucursales seleccionadas si se especifican y no están vacías
        if (!empty($branchIds) && $branchIds !== 'all') {
            if (is_array($branchIds)) {
                // Solo aplicar filtro si el array no está vacío
                if (count($branchIds) > 0) {
                    $query->whereIn('branch_id', $branchIds);
                }
            } else {
                $query->where('branch_id', $branchIds);
            }
        }

        $totalSales = $query->sum('total');
        $salesCount = $query->count();
        $avgSale = $salesCount > 0 ? $totalSales / $salesCount : 0;

        // Ventas del mes anterior para comparación
        $previousMonthStart = Carbon::parse($startDate)->subMonth();
        $previousMonthEnd = Carbon::parse($endDate)->subMonth();
        
        $previousQuery = SaleHeader::whereBetween('date', [$previousMonthStart, $previousMonthEnd]);
        
        // Aplicar el mismo filtro de sucursales al período anterior
        if (!empty($branchIds) && $branchIds !== 'all') {
            if (is_array($branchIds)) {
                $previousQuery->whereIn('branch_id', $branchIds);
            } else {
                $previousQuery->where('branch_id', $branchIds);
            }
        }
        
        $previousTotal = $previousQuery->sum('total');
        
        // Calcular porcentaje de crecimiento
        if ($previousTotal > 0) {
            $growthPercentage = (($totalSales - $previousTotal) / $previousTotal) * 100;
        } else {
            // Si no hay ventas en el período anterior:
            // - Si hay ventas actuales: crecimiento infinito (representamos como null o un valor muy alto)
            // - Si no hay ventas actuales: 0% (sin cambio)
            $growthPercentage = $totalSales > 0 ? null : 0; // null representa crecimiento infinito
        }

        return response()->json([
            'total_sales' => $totalSales,
            'sales_count' => $salesCount,
            'average_sale' => $avgSale,
            'growth_percentage' => $growthPercentage !== null ? round($growthPercentage, 1) : null,
            'period' => [
                'start' => $startDate,
                'end' => $endDate
            ]
        ]);
    }

    /**
     * Obtener alertas de stock bajo por sucursal
     */
    public function getStockAlerts(Request $request)
    {
        $branchIds = $request->query('branch_id', []); // Puede ser array o valor único
        $limit = $request->query('limit', 10);

        $query = Product::with(['stocks' => function($q) use ($branchIds) {
            if (!empty($branchIds) && $branchIds !== 'all') {
                if (is_array($branchIds)) {
                    // Solo aplicar filtro si el array no está vacío
                    if (count($branchIds) > 0) {
                        $q->whereIn('branch_id', $branchIds);
                    }
                } else {
                    $q->where('branch_id', $branchIds);
                }
            }
        }])
        ->whereHas('stocks', function($q) use ($branchIds) {
            if (!empty($branchIds) && $branchIds !== 'all') {
                if (is_array($branchIds)) {
                    // Solo aplicar filtro si el array no está vacío
                    if (count($branchIds) > 0) {
                        $q->whereIn('branch_id', $branchIds);
                    }
                } else {
                    $q->where('branch_id', $branchIds);
                }
            }
        });

        $products = $query->get();

        $alerts = [];
        foreach ($products as $product) {
            foreach ($product->stocks as $stock) {
                if ($stock->current_stock <= $stock->min_stock) {
                    $status = $stock->current_stock <= 0 ? 'out_of_stock' : 'low_stock';
                    $alerts[] = [
                        'product_id' => $product->id,
                        'product_name' => $product->description,
                        'branch_id' => $stock->branch_id,
                        'branch_name' => $stock->branch->description ?? 'Sin nombre',
                        'current_quantity' => $stock->current_stock,
                        'min_stock' => $stock->min_stock,
                        'status' => $status
                    ];
                }
            }
        }

        // Ordenar por cantidad actual (menor primero)
        usort($alerts, function($a, $b) {
            return $a['current_quantity'] <=> $b['current_quantity'];
        });

        return response()->json(array_slice($alerts, 0, $limit));
    }

    /**
     * Obtener ventas por sucursal para gráfico
     */
    public function getSalesByBranch(Request $request)
    {
        $branchIds = $request->query('branch_id', []); // Puede ser array o valor único
        $startDate = $request->query('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth());

        $query = SaleHeader::select(
                'branch_id',
                DB::raw('SUM(total) as total_sales'),
                DB::raw('COUNT(*) as sales_count')
            )
            ->with('branch:id,description')
            ->whereBetween('date', [$startDate, $endDate]);

        // Filtrar por sucursales seleccionadas si se especifican y no están vacías
        if (!empty($branchIds) && $branchIds !== 'all') {
            if (is_array($branchIds)) {
                // Solo aplicar filtro si el array no está vacío
                if (count($branchIds) > 0) {
                    $query->whereIn('branch_id', $branchIds);
                }
            } else {
                $query->where('branch_id', $branchIds);
            }
        }

        $salesByBranch = $query->groupBy('branch_id')->get();

        // Nuevo: asegurar que se incluyan las sucursales seleccionadas aunque tengan 0
        $selectedBranches = null;
        if (!empty($branchIds) && $branchIds !== 'all') {
            $ids = is_array($branchIds) ? $branchIds : [$branchIds];
            $selectedBranches = Branch::whereIn('id', $ids)->get(['id', 'description']);
        } elseif ($branchIds === 'all') {
            $selectedBranches = Branch::all(['id', 'description']);
        }

        $byBranch = $salesByBranch->keyBy('branch_id');

        if ($selectedBranches && $selectedBranches->count() > 0) {
            $result = $selectedBranches->map(function ($branch) use ($byBranch) {
                $row = $byBranch->get($branch->id);
                return [
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->description,
                    'total' => $row ? $row->total_sales : 0,
                    'count' => $row ? $row->sales_count : 0,
                ];
            })->values();
        } else {
            // Fallback: comportamiento anterior (solo sucursales con ventas)
            $result = $salesByBranch->map(function ($sale) {
                return [
                    'branch_id' => $sale->branch_id,
                    'branch_name' => $sale->branch->description ?? 'Sin nombre',
                    'total' => $sale->total_sales,
                    'count' => $sale->sales_count,
                ];
            });
        }

        return response()->json($result);
    }

    /**
     * Obtener datos de ventas mensuales para el gráfico de overview
     */
    public function getMonthlySales(Request $request)
    {
        $branchIds = $request->query('branch_id', []); // Puede ser array o valor único
        $year = $request->query('year', Carbon::now()->year);

        $query = SaleHeader::select(
                DB::raw('MONTH(date) as month'),
                DB::raw('SUM(total) as total')
            )
            ->whereYear('date', $year);

        // Filtrar por sucursales seleccionadas si se especifican y no están vacías
        if (!empty($branchIds) && $branchIds !== 'all') {
            if (is_array($branchIds)) {
                // Solo aplicar filtro si el array no está vacío
                if (count($branchIds) > 0) {
                    $query->whereIn('branch_id', $branchIds);
                }
            } else {
                $query->where('branch_id', $branchIds);
            }
        }

        $monthlySales = $query->groupBy(DB::raw('MONTH(date)'))
            ->orderBy('month')
            ->get();

        // Crear array con todos los meses (rellenar con 0 los que no tienen ventas)
        $months = [
            1 => 'Ene', 2 => 'Feb', 3 => 'Mar', 4 => 'Abr',
            5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Ago',
            9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dic'
        ];

        $result = [];
        foreach ($months as $monthNumber => $monthName) {
            $salesData = $monthlySales->firstWhere('month', $monthNumber);
            $result[] = [
                'name' => $monthName,
                'total' => $salesData ? $salesData->total : 0
            ];
        }

        return response()->json($result);
    }

    /**
     * Obtener estadísticas generales del dashboard
     */
    public function getGeneralStats(Request $request)
    {
        // Parámetros
        $branchIds = $request->query('branch_id', []); // Puede ser array, valor único, 'all' o vacío
        $startDate = $request->query('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth());

        // Base de ventas en período
        $salesQuery = SaleHeader::whereBetween('date', [$startDate, $endDate]);

        // Filtro por sucursales
        if (!empty($branchIds) && $branchIds !== 'all') {
            if (is_array($branchIds)) {
                if (count($branchIds) > 0) {
                    $salesQuery->whereIn('branch_id', $branchIds);
                }
            } else {
                $salesQuery->where('branch_id', $branchIds);
            }
        }

        $totalSales = (float) $salesQuery->sum('total');
        $salesCount = (int) $salesQuery->count();

        // Productos activos (con filtro opcional por sucursales)
        $productsQuery = Product::where('status', 1);
        if (!empty($branchIds) && $branchIds !== 'all') {
            if (is_array($branchIds)) {
                if (count($branchIds) > 0) {
                    $productsQuery->whereHas('stocks', function ($q) use ($branchIds) {
                        $q->whereIn('branch_id', $branchIds);
                    });
                }
            } else {
                $productsQuery->whereHas('stocks', function ($q) use ($branchIds) {
                    $q->where('branch_id', $branchIds);
                });
            }
        }
        $activeProducts = (int) $productsQuery->count();

        // Clientes únicos en el período (excluyendo nulos)
        $uniqueCustomers = (clone $salesQuery)
            ->whereNotNull('customer_id')
            ->distinct('customer_id')
            ->count('customer_id');

        return response()->json([
            'total_sales' => $totalSales,
            'sales_count' => $salesCount,
            'active_products' => $activeProducts,
            'unique_customers' => $uniqueCustomers,
        ]);
    }
}
