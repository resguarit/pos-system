<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ConfigController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentTypeController;
use App\Http\Controllers\IvaController;
use App\Http\Controllers\MeasureController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\API\PurchaseOrderController as APIPurchaseOrderController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\CashRegisterController;
use App\Http\Controllers\CashMovementController;
use App\Http\Controllers\CurrentAccountController;
use App\Http\Controllers\MovementTypeController;
use App\Http\Controllers\RepairController; // Added
use App\Http\Controllers\ExchangeRateController; // **SOLUCIÓN BUG #2**
use App\Http\Controllers\SaleAnnulmentController;

// Rutas públicas (sin autenticación)
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/register', [AuthController::class, 'register']);

// Rutas públicas para exchange rates (para desarrollo)
Route::prefix('exchange-rates')->group(function () {
    Route::get('/', [ExchangeRateController::class, 'index']);
    Route::post('/', [ExchangeRateController::class, 'store']);
    Route::get('/current', [ExchangeRateController::class, 'getCurrentRate']);
    Route::post('/convert', [ExchangeRateController::class, 'convert']);
    Route::post('/update', [ExchangeRateController::class, 'update']);
});


Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Endpoint estándar para obtener el usuario autenticado (para compatibilidad con /auth/me)
Route::middleware('auth:sanctum')->get('/auth/me', function (Request $request) {
    return response()->json($request->user());
});

// Rutas para usuario autenticado
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [UserController::class, 'getProfile']);
    Route::get('/my-branches', [UserController::class, 'getMyBranches']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

// Configuración
Route::middleware('auth:sanctum')->prefix('settings')->group(function () {
    Route::get('/', [SettingController::class, 'index']);
    Route::post('/', [SettingController::class, 'store']);
});

// Todas las rutas protegidas con autenticación
Route::middleware('auth:sanctum')->group(function () {
    
    Route::prefix('pos')->group(function () {
        Route::get('/products', [PosController::class, 'searchProducts']);
        Route::get('/payment-methods', [PosController::class, 'getPaymentMethods']);
        Route::middleware('cash.open')->group(function () {
            Route::post('/sales', [PosController::class, 'storeSale']);
        });
        
        Route::get('/sales/{id}/pdf', [SaleController::class, 'downloadPdf'])->whereNumber('id');
    });

    Route::prefix('branches')->group(function () {
        Route::get('/', [BranchController::class, 'index']);
        Route::get('/check-name/{name}', [BranchController::class, 'checkName']);
        Route::get('/{id}', [BranchController::class, 'show']);
        Route::post('/', [BranchController::class, 'store']);
        Route::put('/{id}', [BranchController::class, 'update']);
        Route::delete('/{id}', [BranchController::class, 'destroy']);
        Route::get('/active', [BranchController::class, 'active']);
        Route::get('/{id}/personnel', [BranchController::class, 'personnel']);
    });

    Route::prefix('products')->group(function () {
        Route::get('/', [ProductController::class, 'index']);
        Route::get('/check-code/{code}', [ProductController::class, 'checkCode']);
        Route::get('/check-description/{description}', [ProductController::class, 'checkDescription']);
        Route::get('/{id}', [ProductController::class, 'show']);
        Route::post('/', [ProductController::class, 'store']);
        Route::put('/{id}', [ProductController::class, 'update']);
        Route::delete('/{id}', [ProductController::class, 'destroy']);
        Route::get('/export/price-list', [ProductController::class, 'exportPriceList']);
        Route::post('/bulk-update-prices', [ProductController::class, 'bulkUpdatePrices']);
        Route::post('/bulk-update-prices-by-category', [ProductController::class, 'bulkUpdatePricesByCategory']);
        Route::get('/by-categories', [ProductController::class, 'getProductsByCategories']);
    });

    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index']);
        Route::get('/check-name/{name}', [CategoryController::class, 'checkName']);
        Route::get('/parents', [CategoryController::class, 'parents']);
        Route::get('/subcategories/{parentId?}', [CategoryController::class, 'subcategories']);
        Route::get('/for-selector', [CategoryController::class, 'forSelector']);
        Route::get('/{id}', [CategoryController::class, 'show']);
        Route::post('/', [CategoryController::class, 'store']);
        Route::put('/{id}', [CategoryController::class, 'update']);
        Route::delete('/{id}', [CategoryController::class, 'destroy']);
    });

    // **SOLUCIÓN BUG #2**: Rutas para gestión de tasa de cambio
    Route::prefix('exchange-rate')->group(function () {
        Route::get('/current', [ExchangeRateController::class, 'getCurrentRate']);
        Route::post('/update-prices', [ExchangeRateController::class, 'updatePricesFromExchangeRate']);
        Route::post('/preview-impact', [ExchangeRateController::class, 'getExchangeRateImpactPreview']);
        Route::get('/usd-products-stats', [ExchangeRateController::class, 'getUsdProductsStats']);
    });

    Route::prefix('measures')->group(function () {
        Route::get('/', [MeasureController::class, 'index']);
        Route::get('/{id}', [MeasureController::class, 'show']);
        Route::post('/', [MeasureController::class, 'store']);
        Route::put('/{id}', [MeasureController::class, 'update']);
        Route::delete('/{id}', [MeasureController::class, 'destroy']);
    });

    Route::prefix('suppliers')->group(function () {
        Route::get('/', [SupplierController::class, 'index']);
        Route::get('/check-name/{name}', [SupplierController::class, 'checkName']);
        Route::get('/{id}', [SupplierController::class, 'show']);
        Route::post('/', [SupplierController::class, 'store']); 
        Route::put('/{id}', [SupplierController::class, 'update']);
        Route::delete('/{id}', [SupplierController::class, 'destroy']);
    });

    Route::prefix('purchase-orders')->group(function () {
    Route::get('/', [PurchaseOrderController::class, 'index']);
    Route::get('/summary-by-currency', [PurchaseOrderController::class, 'summaryByCurrency']);
    Route::get('/{id}', [PurchaseOrderController::class, 'show']);
    Route::post('/', [PurchaseOrderController::class, 'store']);
    Route::put('/{id}', [PurchaseOrderController::class, 'update']);
    Route::delete('/{id}', [PurchaseOrderController::class, 'destroy']);
    Route::patch('/{id}/finalize', [PurchaseOrderController::class, 'finalize']);
    Route::patch('/{id}/cancel', [PurchaseOrderController::class, 'cancel']);
    Route::get('/{id}/pdf', [PurchaseOrderController::class, 'downloadPdf'])->whereNumber('id');
    });

    Route::prefix('ivas')->group(function () {
        Route::get('/', [IvaController::class, 'index']);
        Route::get('/{id}', [IvaController::class, 'show']);
        Route::post('/', [IvaController::class, 'store']);
        Route::put('/{id}', [IvaController::class, 'update']);
        Route::delete('/{id}', [IvaController::class, 'destroy']);
    });

    Route::prefix('stocks')->group(function () {
        Route::get('/', [StockController::class, 'index']);
        Route::get('/{id}', [StockController::class, 'show']);
        Route::post('/', [StockController::class, 'store']);
        // Use route-model binding for update to match controller signature (Stock $stock)
        Route::put('/{stock}', [StockController::class, 'update']);
        Route::delete('/{id}', [StockController::class, 'destroy']);
        Route::post('/by-product-branch', [StockController::class, 'getByProductAndBranch']);
        Route::patch('/{id}/quantity', [StockController::class, 'updateQuantity']);
        Route::post('/reduce', [StockController::class, 'reduceStock']);
    });

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::post('/', [UserController::class, 'store']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
        Route::get('/{id}/branches', [UserController::class, 'userBranches']);
        Route::put('/{id}/branches', [UserController::class, 'updateUserBranches']);
    });

    Route::prefix('roles')->group(function () {
        Route::get('/permissions-count', [RoleController::class, 'getPermissionsCountByRole']);
        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::get('/check-name/{name}', [RoleController::class, 'checkName']);
        Route::get('/', [RoleController::class, 'index']);
        Route::get('/{id}', [RoleController::class, 'show']);
        Route::post('/', [RoleController::class, 'store']);
        Route::put('/{id}', [RoleController::class, 'update']);
        Route::delete('/{id}', [RoleController::class, 'destroy']);
        Route::get('/{id}/permissions', [RoleController::class, 'getRolePermissions']);
        Route::put('/{id}/permissions', [RoleController::class, 'setRolePermissions']);
    });

    Route::prefix('customers')->group(function () {
        Route::get('/', [CustomerController::class, 'index']);
        Route::get('/check-name/{firstName}/{lastName}', [CustomerController::class, 'checkName']);
        Route::get('/{id}', [CustomerController::class, 'show']);
        Route::post('/', [CustomerController::class, 'store']);
        Route::put('/{id}', [CustomerController::class, 'update']);
        Route::delete('/{id}', [CustomerController::class, 'destroy']);
        Route::get('/{id}/sales', [CustomerController::class, 'getCustomerSalesWithSummary']);
    });

    Route::prefix('document-types')->group(function () {
        Route::get('/', [DocumentTypeController::class, 'index']);
        Route::get('/{id}', [DocumentTypeController::class, 'show']);
        Route::post('/', [DocumentTypeController::class, 'store']);
        Route::put('/{id}', [DocumentTypeController::class, 'update']);
        Route::delete('/{id}', [DocumentTypeController::class, 'destroy']);
    });

    Route::prefix('payment-methods')->group(function () {
        Route::get('/', [PaymentMethodController::class, 'index']);
        Route::get('/{id}', [PaymentMethodController::class, 'show']);
        Route::post('/', [PaymentMethodController::class, 'store']);
        Route::put('/{id}', [PaymentMethodController::class, 'update']);
        Route::delete('/{id}', [PaymentMethodController::class, 'destroy']);
    });

    Route::prefix('fiscal-conditions')->group(function () {
        Route::get('/', [ConfigController::class, 'getFiscalConditions']);
    });

    Route::prefix('receipt-types')->group(function () {
        Route::get('/', [ConfigController::class, 'getReceiptTypes']);
    });

    Route::prefix('sales')->group(function () {
        Route::get('/', [SaleController::class, 'index']);
        Route::get('/summary', [SaleController::class, 'summary']); 
        Route::get('/summary/all-branches', [SaleController::class, 'summaryAllBranches']); 
        Route::get('/{id}', [SaleController::class, 'show'])->whereNumber('id');
        
        // Rutas que requieren caja abierta
        Route::middleware('cash.open')->group(function () {
            Route::post('/', [SaleController::class, 'store']);
            Route::put('/{id}', [SaleController::class, 'update'])->whereNumber('id');
        });
        
        Route::delete('/{id}', [SaleController::class, 'destroy'])->whereNumber('id');
        Route::post('/{id}/annul', [SaleAnnulmentController::class, 'annulSale'])->whereNumber('id');
        Route::get('/download-pdf/{id}', [SaleController::class, 'downloadPdf'])->whereNumber('id');
        Route::get('/history/branch/{branchId}', [SaleController::class, 'salesHistoryByBranch'])->whereNumber('branchId');
        Route::get('/global', [SaleController::class, 'indexGlobal']);
        Route::get('/global/summary', [SaleController::class, 'summaryGlobal']);
        Route::get('/global/history', [SaleController::class, 'historyGlobal']);
    });

    // Cash Register Routes
    Route::prefix('cash-registers')->group(function () {
        Route::post('/open', [CashRegisterController::class, 'open']);
        Route::post('/{id}/close', [CashRegisterController::class, 'close']);
        Route::get('/current', [CashRegisterController::class, 'current']);
        Route::get('/current-optimized', [CashRegisterController::class, 'currentOptimized']);
        Route::get('/multiple-branches', [CashRegisterController::class, 'multipleBranches']);
        Route::get('/cash-registers-history', [CashRegisterController::class, 'cashRegistersHistory']);
        Route::get('/payment-methods-optimized', [CashRegisterController::class, 'getPaymentMethodsOptimized']);
        Route::get('/check-status', [CashRegisterController::class, 'checkStatus']);
        Route::get('/check-multiple-branches-status', [CashRegisterController::class, 'checkMultipleBranchesStatus']);
        Route::get('/history', [CashRegisterController::class, 'history']);
        Route::get('/transactions/history', [CashRegisterController::class, 'transactionsHistory']);
        
        // Reports
        Route::get('/reports/movements', [CashRegisterController::class, 'reportsMovements']);
        Route::get('/reports/closures', [CashRegisterController::class, 'reportsClosures']);
        Route::get('/reports/financial', [CashRegisterController::class, 'reportsFinancial']);
        Route::get('/export', [CashRegisterController::class, 'export']);

        Route::get('/{id}', [CashRegisterController::class, 'show']);
    });

    // Cash Movement Routes
    Route::prefix('cash-movements')->group(function () {
        Route::get('/', [CashMovementController::class, 'index']);
        Route::post('/', [CashMovementController::class, 'store']);
        Route::get('/{id}', [CashMovementController::class, 'show']);
        Route::delete('/{id}', [CashMovementController::class, 'destroy']);
    });

    // Current Account Routes
    Route::prefix('current-accounts')->group(function () {
        Route::post('/', [CurrentAccountController::class, 'store']);
        Route::get('/customer/{customerId}', [CurrentAccountController::class, 'getByCustomer']);
        Route::get('/{accountId}/movements', [CurrentAccountController::class, 'movements']);
        Route::get('/{accountId}/balance', [CurrentAccountController::class, 'balance']);
        Route::post('/{accountId}/payments', [CurrentAccountController::class, 'processPayment']);
    });

    Route::prefix('movement-types')->group(function () {
        Route::get('/', [MovementTypeController::class, 'index']);
        Route::post('/', [MovementTypeController::class, 'store']);
        Route::get('/{id}', [MovementTypeController::class, 'show']);
        Route::put('/{id}', [MovementTypeController::class, 'update']);
        Route::delete('/{id}', [MovementTypeController::class, 'destroy']);
    });

    // Dashboard Routes
    Route::prefix('dashboard')->group(function () {
        Route::get('/sales-summary', [DashboardController::class, 'getSalesSummary']);
        Route::get('/stock-alerts', [DashboardController::class, 'getStockAlerts']);
        Route::get('/sales-by-branch', [DashboardController::class, 'getSalesByBranch']);
        Route::get('/monthly-sales', [DashboardController::class, 'getMonthlySales']);
        Route::get('/general-stats', [DashboardController::class, 'getGeneralStats']);
    });

    // Repairs Routes
    Route::prefix('repairs')->group(function () {
        Route::get('/', [RepairController::class, 'index']);
        Route::get('/stats', [RepairController::class, 'stats']);
        Route::get('/options', [RepairController::class, 'options']);
        Route::get('/{id}', [RepairController::class, 'show'])->whereNumber('id');
        Route::post('/', [RepairController::class, 'store']);
        Route::put('/{id}', [RepairController::class, 'update'])->whereNumber('id');
        Route::delete('/{id}', [RepairController::class, 'destroy'])->whereNumber('id');
        Route::patch('/{id}/status', [RepairController::class, 'updateStatus'])->whereNumber('id');
        Route::patch('/{id}/assign', [RepairController::class, 'assign'])->whereNumber('id');
        Route::post('/{id}/notes', [RepairController::class, 'addNote'])->whereNumber('id');
    });

});
