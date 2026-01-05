<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BranchController;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;

Route::get('/', function () {
    return view('welcome');
});

// Ruta para servir archivos de storage públicamente (fallback para symlink)
// Esto es útil para logos y favicons guardados en storage
Route::get('/storage/{path}', function ($path) {
    try {
        $filePath = storage_path('app/public/' . $path);

        if (!file_exists($filePath)) {
            abort(404);
        }

        // Verificar que el archivo esté dentro de storage/app/public para seguridad
        $storagePath = storage_path('app/public');
        $realStoragePath = realpath($storagePath);
        $realFilePath = realpath($filePath);

        if ($realFilePath === false || strpos($realFilePath, $realStoragePath) !== 0) {
            abort(403, 'Acceso denegado');
        }

        $file = file_get_contents($filePath);
        $mimeType = mime_content_type($filePath);

        return Response::make($file, 200, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=31536000',
        ]);
    } catch (\Exception $e) {
        abort(404);
    }
})->where('path', '.*');

// Route::resource('branches', BranchController::class);

// RUTA DE DEBUG Y REPARACIÓN - Ejecutar para corregir saldos de ventas
Route::get('/debug-fix-account/{accountId}', function ($accountId) {
    try {
        $account = \App\Models\CurrentAccount::find($accountId);
        if (!$account)
            return response()->json(['error' => 'Account not found'], 404);

        $customerId = $account->customer_id;
        $sales = \App\Models\SaleHeader::where('customer_id', $customerId)->get();

        $report = [];
        $fixed = 0;

        foreach ($sales as $sale) {
            $paid = (float) $sale->paid_amount;
            $total = (float) $sale->total;
            $diff = abs($total - $paid);

            $item = [
                'id' => $sale->id,
                'receipt' => $sale->receipt_number,
                'date' => $sale->date,
                'total' => $total,
                'paid' => $paid,
                'diff' => $diff,
                'status' => $sale->status,
                'payment_status' => $sale->payment_status,
                'pending_amount' => $sale->pending_amount,
            ];

            // Fix logic: If difference is small and status is not paid using epsilon
            if ($diff < 1.0 && $total > 0 && $sale->payment_status !== 'paid') {
                $sale->paid_amount = $total;
                $sale->payment_status = 'paid';
                $sale->save();
                $item['fixed'] = true;
                $fixed++;
            }

            $report[] = $item;
        }

        return [
            'success' => true,
            'message' => "Proceso completado. Se corrigieron {$fixed} ventas.",
            'account_id' => $accountId,
            'customer_id' => $customerId,
            'fixed_count' => $fixed,
            'sales_report' => $report
        ];
    } catch (\Exception $e) {
        return ['error' => $e->getMessage()];
    }
});
