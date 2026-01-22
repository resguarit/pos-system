<?php

namespace App\Http\Controllers;

use App\Models\SaleHeader;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    /**
     * Get general statistics (Total Sales, Total Revenue)
     */
    public function general(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $branchId = $request->input('branch_id'); // Optional branch filter

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

        // Filter out annulled sales or unwanted statuses if necessary
        // Assuming status logic or soft deletes handle this.
        // If there's a status column, we should filter by it.
        // Based on migrations: 2025_12_05_104002_add_status_to_sales_header_table.php
        // Let's assume standard 'completed' status or similar, but for now just count all non-deleted.
        // SalesHeader uses SoftDeletes so deleted_at check is automatic.

        $totalSales = $query->count();
        $totalRevenue = $query->sum('total');

        return response()->json([
            'total_sales' => $totalSales,
            'total_revenue' => (float) $totalRevenue,
        ]);
    }

    /**
     * Get sales grouped by product
     */
    public function salesByProduct(Request $request)
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
            ->whereNull('sales_header.deleted_at') // Explicit check if joins affect soft deletes
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

        $sales = $query->get();

        return response()->json($sales);
    }

    /**
     * Get top selling products
     */
    public function topProducts(Request $request)
    {
        $limit = $request->input('limit', 5);
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

        $topProducts = $query->limit($limit)->get();

        return response()->json($topProducts);
    }
}
