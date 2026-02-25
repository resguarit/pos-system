<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StatisticsFilterRequest;
use App\Services\StatisticsService;
use App\Models\SaleHeader;
use App\Models\SaleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Controller de estadísticas de ventas.
 *
 * Los endpoints legacy (general, salesByProduct, topProducts) se mantienen
 * por compatibilidad. Los nuevos endpoints avanzados delegan toda la lógica
 * de negocio al StatisticsService.
 */
class StatisticsController extends Controller
{
    public function __construct(
        private readonly StatisticsService $statisticsService
    ) {
    }

    // ========================================================================
    // Legacy endpoints (mantienen la API original)
    // ========================================================================

    /**
     * Get general statistics (Total Sales, Total Revenue).
     */
    public function general(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $branchId = $request->input('branch_id');

        $query = SaleHeader::query();

        if ($startDate) {
            $query->whereDate('date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('date', '<=', $endDate);
        }
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return response()->json([
            'total_sales' => $query->count(),
            'total_revenue' => (float) $query->sum('total'),
        ]);
    }

    /**
     * Get sales grouped by product.
     */
    public function salesByProduct(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $branchId = $request->input('branch_id');

        $query = SaleItem::query()
            ->join('sales_header', 'sale_items.sale_header_id', '=', 'sales_header.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->select(
                'products.id as product_id',
                'products.description as product_name',
                DB::raw('SUM(sale_items.quantity) as total_quantity'),
                DB::raw('SUM(sale_items.item_total) as total_revenue')
            )
            ->whereNull('sales_header.deleted_at')
            ->groupBy('products.id', 'products.description');

        if ($startDate) {
            $query->whereDate('sales_header.date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('sales_header.date', '<=', $endDate);
        }
        if ($branchId) {
            $query->where('sales_header.branch_id', $branchId);
        }

        return response()->json($query->get());
    }

    /**
     * Get top selling products.
     */
    public function topProducts(Request $request): JsonResponse
    {
        $limit = (int) $request->input('limit', 5);
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $branchId = $request->input('branch_id');

        $query = SaleItem::query()
            ->join('sales_header', 'sale_items.sale_header_id', '=', 'sales_header.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->select(
                'products.id as product_id',
                'products.description as product_name',
                DB::raw('SUM(sale_items.quantity) as total_quantity'),
                DB::raw('SUM(sale_items.item_total) as total_revenue')
            )
            ->whereNull('sales_header.deleted_at')
            ->groupBy('products.id', 'products.description')
            ->orderByDesc('total_quantity');

        if ($startDate) {
            $query->whereDate('sales_header.date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('sales_header.date', '<=', $endDate);
        }
        if ($branchId) {
            $query->where('sales_header.branch_id', $branchId);
        }

        return response()->json($query->limit($limit)->get());
    }

    // ========================================================================
    // Advanced endpoints (delegan al StatisticsService)
    // ========================================================================

    public function advancedStats(StatisticsFilterRequest $request): JsonResponse
    {
        return response()->json(
            $this->statisticsService->getAdvancedStats($request->filters())
        );
    }

    public function salesByUser(StatisticsFilterRequest $request): JsonResponse
    {
        return response()->json(
            $this->statisticsService->getSalesByUser($request->filters())
        );
    }

    public function salesByCategory(StatisticsFilterRequest $request): JsonResponse
    {
        return response()->json(
            $this->statisticsService->getSalesByCategory($request->filters())
        );
    }

    public function salesBySupplier(StatisticsFilterRequest $request): JsonResponse
    {
        return response()->json(
            $this->statisticsService->getSalesBySupplier($request->filters())
        );
    }

    public function salesByHour(StatisticsFilterRequest $request): JsonResponse
    {
        return response()->json(
            $this->statisticsService->getSalesByHour($request->filters())
        );
    }

    public function salesByPaymentMethod(StatisticsFilterRequest $request): JsonResponse
    {
        return response()->json(
            $this->statisticsService->getSalesByPaymentMethod($request->filters())
        );
    }

    public function salesByDayOfWeek(StatisticsFilterRequest $request): JsonResponse
    {
        return response()->json(
            $this->statisticsService->getSalesByDayOfWeek($request->filters())
        );
    }

    public function salesDailyTrend(StatisticsFilterRequest $request): JsonResponse
    {
        return response()->json(
            $this->statisticsService->getDailyTrend($request->filters())
        );
    }

    public function topProductsAdvanced(StatisticsFilterRequest $request): JsonResponse
    {
        return response()->json(
            $this->statisticsService->getTopProducts($request->filters())
        );
    }
}
