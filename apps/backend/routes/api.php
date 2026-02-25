<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\EquipmentCategoryController;
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
use App\Http\Controllers\Api\ServiceTypeController;
use App\Http\Controllers\Api\ClientServiceController as ApiClientServiceController;
use App\Http\Controllers\FinancialReportController;
use App\Http\Controllers\ExchangeRateController; // **SOLUCIÓN BUG #2**
use App\Http\Controllers\SaleAnnulmentController;
use App\Http\Controllers\ComboController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\ProductCostHistoryController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\ArcaController;
use App\Http\Controllers\ArcaCertificateController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ExpenseReminderController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ExpenseCategoryController;
use App\Http\Controllers\StatisticsController;

// Rutas públicas (sin autenticación)
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/register', [AuthController::class, 'register']);

// Rutas públicas para exchange rates (para desarrollo) - ELIMINADAS POR SEGURIDAD
// Las rutas de gestión ahora están protegidas bajo /exchange-rate

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Endpoint estándar para obtener el usuario autenticado (para compatibilidad con /auth/me)
Route::middleware('auth:sanctum')->get('/auth/me', function (Request $request) {
    return response()->json($request->user());
});

// Rutas para usuario autenticado
Route::middleware(['auth:sanctum', 'schedule.check'])->group(function () {
    Route::get('/profile', [UserController::class, 'getProfile']);
    Route::get('/my-branches', [UserController::class, 'getMyBranches']);
    Route::post('/logout', [AuthController::class, 'logout']);
});



// Todas las rutas protegidas con autenticación
Route::middleware(['auth:sanctum', 'schedule.check'])->group(function () {

    Route::prefix('pos')->group(function () {
        // POS requiere permiso de crear ventas para operar
        Route::middleware('has_permission:crear_ventas')->group(function () {
            Route::get('/products', [PosController::class, 'searchProducts']);
            Route::get('/payment-methods', [PosController::class, 'getPaymentMethods']);
            Route::middleware('cash.open')->group(function () {
                Route::post('/sales', [PosController::class, 'storeSale']);
            });
            Route::get('/sales/{id}/pdf', [SaleController::class, 'downloadPdf'])->whereNumber('id');
            Route::get('/sales/{id}/receipt-preview-html', [SaleController::class, 'getReceiptPreviewHtml'])->whereNumber('id');
        });
    });

    // DEBUG: Ruta temporal pública para ver HTML del SDK (ELIMINAR DESPUÉS DE DEBUGGEAR)
    Route::get('/pos/sales/{id}/debug-html', [SaleController::class, 'debugSdkHtml'])
        ->whereNumber('id')
        ->withoutMiddleware(['auth:sanctum']);

    Route::prefix('branches')->group(function () {
        Route::middleware('has_permission:ver_sucursales')->group(function () {
            Route::get('/', [BranchController::class, 'index']);
            Route::get('/check-name/{name}', [BranchController::class, 'checkName']);
            Route::get('/{id}', [BranchController::class, 'show']);
            Route::get('/active', [BranchController::class, 'active']);

            Route::middleware('has_permission:ver_personal_sucursal')->get('/{id}/personnel', [BranchController::class, 'personnel']);
        });

        Route::middleware('has_permission:crear_sucursales')->post('/', [BranchController::class, 'store']);
        Route::middleware('has_permission:editar_sucursales')->put('/{id}', [BranchController::class, 'update']);
        Route::middleware('has_permission:eliminar_sucursales')->delete('/{id}', [BranchController::class, 'destroy']);
    });

    // ARCA Routes - Facturación electrónica (reemplazo de AFIP)
    Route::prefix('arca')->middleware('has_permission:ver_configuracion_sistema|crear_ventas')->group(function () {
        Route::get('/receipt-types', [ArcaController::class, 'getReceiptTypes']);
        Route::get('/points-of-sale', [ArcaController::class, 'getPointsOfSale']);
        Route::get('/status', [ArcaController::class, 'checkAfipStatus']);

        // Certificate management routes (multi-CUIT support)
        Route::prefix('certificates')->group(function () {
            // Rutas de solo lectura para verificar certificados (necesarias para autorizar ventas)
            // Accesibles para usuarios que pueden crear ventas O ver configuración
            Route::middleware('has_permission:ver_configuracion_sistema|crear_ventas')->group(function () {
                Route::get('/valid', [ArcaCertificateController::class, 'getValid']);
                Route::get('/check', [ArcaCertificateController::class, 'checkCuit']);
            });

            // Rutas de administración de certificados (solo configuración del sistema)
            Route::middleware('has_permission:ver_configuracion_sistema')->group(function () {
                Route::get('/', [ArcaCertificateController::class, 'index']);
                Route::get('/{arcaCertificate}', [ArcaCertificateController::class, 'show']);
            });

            Route::middleware('has_permission:editar_configuracion_sistema')->group(function () {
                Route::post('/', [ArcaCertificateController::class, 'store']);
                Route::put('/{arcaCertificate}', [ArcaCertificateController::class, 'update']);
                Route::delete('/{arcaCertificate}', [ArcaCertificateController::class, 'destroy']);
                Route::post('/{arcaCertificate}/certificate', [ArcaCertificateController::class, 'uploadCertificate']);
                Route::post('/{arcaCertificate}/private-key', [ArcaCertificateController::class, 'uploadPrivateKey']);
            });
        });
    });

    Route::prefix('products')->group(function () {
        // Lectura de productos (solo requiere autenticación)
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/', [ProductController::class, 'index']);
            Route::get('/check-code/{code}', [ProductController::class, 'checkCode']);
            Route::get('/check-description/{description}', [ProductController::class, 'checkDescription']);
            Route::get('/{id}', [ProductController::class, 'show']);
            Route::get('/{id}/traceability', [\App\Http\Controllers\ProductTraceabilityController::class, 'getHistory'])
                ->middleware('has_permission:ver_trazabilidad_producto');
            Route::get('/export/price-list', [ProductController::class, 'exportPriceList']);
            Route::get('/by-categories', [ProductController::class, 'getProductsByCategories']);
        });

        Route::middleware('has_permission:crear_productos')->post('/', [ProductController::class, 'store']);

        Route::middleware('has_permission:editar_productos')->group(function () {
            Route::put('/{id}', [ProductController::class, 'update']);

            // Bulk updates
            Route::middleware('has_permission:actualizar_precios_masivo')->group(function () {
                Route::post('/bulk-update-prices', [ProductController::class, 'bulkUpdatePrices']);
                Route::post('/bulk-update-prices-by-category', [ProductController::class, 'bulkUpdatePricesByCategory']);
                Route::post('/bulk-update-prices-by-supplier', [ProductController::class, 'bulkUpdatePricesBySupplier']);
            });
        });

        Route::middleware('has_permission:eliminar_productos')->delete('/{id}', [ProductController::class, 'destroy']);
    });

    // Product Cost History Routes
    // Product Cost History Routes
    Route::prefix('product-cost-history')->middleware('has_permission:ver_productos')->group(function () {
        Route::get('/product/{productId}', [ProductCostHistoryController::class, 'getProductHistory']);
        Route::get('/product/{productId}/last', [ProductCostHistoryController::class, 'getLastCostChange']);
        Route::post('/multiple', [ProductCostHistoryController::class, 'getMultipleProductsHistory']);
    });

    // Rutas específicas para actualización masiva (completamente fuera del grupo de productos)
    Route::middleware('has_permission:actualizar_precios_masivo')->group(function () {
        Route::get('/bulksearch', [ProductController::class, 'searchProductsForBulkUpdate']);
        Route::get('/bulkstats', [ProductController::class, 'getBulkUpdateStats']);
        Route::post('/bulksupplier', [ProductController::class, 'bulkUpdatePricesBySupplier']);
    });

    Route::prefix('categories')->group(function () {
        Route::middleware('has_permission:ver_categorias')->group(function () {
            Route::get('/', [CategoryController::class, 'index']);
            Route::get('/check-name/{name}', [CategoryController::class, 'checkName']);
            Route::get('/parents', [CategoryController::class, 'parents']);
            Route::get('/subcategories/{parentId?}', [CategoryController::class, 'subcategories']);
            Route::get('/for-selector', [CategoryController::class, 'forSelector']);
            Route::get('/{id}', [CategoryController::class, 'show']);
        });

        Route::middleware('has_permission:crear_categorias')->post('/', [CategoryController::class, 'store']);
        Route::middleware('has_permission:editar_categorias')->put('/{id}', [CategoryController::class, 'update']);
        Route::middleware('has_permission:eliminar_categorias')->delete('/{id}', [CategoryController::class, 'destroy']);
    });

    Route::prefix('equipment-categories')->group(function () {
        Route::middleware('has_permission:ver_categorias_equipos')->group(function () {
            Route::get('/', [EquipmentCategoryController::class, 'index']);
            Route::get('/check-name/{name}', [EquipmentCategoryController::class, 'checkName']);
            Route::get('/parents', [EquipmentCategoryController::class, 'parents']);
            Route::get('/subcategories/{parentId?}', [EquipmentCategoryController::class, 'subcategories']);
            Route::get('/for-selector', [EquipmentCategoryController::class, 'forSelector']);
            Route::get('/{id}', [EquipmentCategoryController::class, 'show']);
        });

        Route::middleware('has_permission:crear_categorias_equipos')->post('/', [EquipmentCategoryController::class, 'store']);
        Route::middleware('has_permission:editar_categorias_equipos')->put('/{id}', [EquipmentCategoryController::class, 'update']);
        Route::middleware('has_permission:eliminar_categorias_equipos')->delete('/{id}', [EquipmentCategoryController::class, 'destroy']);
    });

    // **SOLUCIÓN BUG #2**: Rutas para gestión de tasa de cambio
    // Lectura permitida para cualquier usuario autenticado
    Route::prefix('exchange-rate')->group(function () {
        Route::get('/current', [ExchangeRateController::class, 'getCurrentRate']);
    });

    // Escritura restringida
    Route::prefix('exchange-rate')->middleware('has_permission:gestionar_tipo_cambio')->group(function () {
        Route::post('/update', [ExchangeRateController::class, 'update']);
        Route::post('/update-prices', [ExchangeRateController::class, 'updatePricesFromExchangeRate']);
        Route::post('/preview-impact', [ExchangeRateController::class, 'getExchangeRateImpactPreview']);
        Route::get('/usd-products-stats', [ExchangeRateController::class, 'getUsdProductsStats']);
    });

    Route::prefix('measures')->group(function () {
        // Lectura de medidas: cualquier usuario que pueda ver productos
        Route::middleware('has_permission:ver_productos')->group(function () {
            Route::get('/', [MeasureController::class, 'index']);
            Route::get('/{id}', [MeasureController::class, 'show']);
        });
        // Escritura: solo configuración del sistema
        Route::middleware('has_permission:editar_configuracion_sistema')->group(function () {
            Route::post('/', [MeasureController::class, 'store']);
            Route::put('/{id}', [MeasureController::class, 'update']);
            Route::delete('/{id}', [MeasureController::class, 'destroy']);
        });
    });

    Route::prefix('suppliers')->group(function () {
        Route::middleware('has_permission:ver_proveedores')->group(function () {
            Route::get('/', [SupplierController::class, 'index']);
            Route::get('/check-name/{name}', [SupplierController::class, 'checkName']);
            Route::get('/{id}', [SupplierController::class, 'show']);
        });

        Route::middleware('has_permission:crear_proveedores')->post('/', [SupplierController::class, 'store']);
        Route::middleware('has_permission:editar_proveedores')->put('/{id}', [SupplierController::class, 'update']);
        Route::middleware('has_permission:eliminar_proveedores')->delete('/{id}', [SupplierController::class, 'destroy']);
    });

    Route::prefix('purchase-orders')->group(function () {
        Route::middleware('has_permission:ver_ordenes_compra')->group(function () {
            Route::get('/', [PurchaseOrderController::class, 'index']);
            Route::get('/summary-by-currency', [PurchaseOrderController::class, 'summaryByCurrency']);
            Route::get('/{id}', [PurchaseOrderController::class, 'show']);
            Route::get('/{id}/pdf', [PurchaseOrderController::class, 'downloadPdf'])->whereNumber('id');
            Route::get('/{id}/cancel-preview', [PurchaseOrderController::class, 'cancelPreview']);
        });

        Route::middleware('has_permission:crear_ordenes_compra')->post('/', [PurchaseOrderController::class, 'store']);

        Route::middleware('has_permission:editar_ordenes_compra')->group(function () {
            Route::put('/{id}', [PurchaseOrderController::class, 'update']);
            Route::delete('/{id}', [PurchaseOrderController::class, 'destroy']); // Usamos perm de editar para eliminar draft
        });

        Route::middleware('has_permission:completar_ordenes_compra')->patch('/{id}/finalize', [PurchaseOrderController::class, 'finalize']);
        Route::middleware('has_permission:cancelar_ordenes_compra')->patch('/{id}/cancel', [PurchaseOrderController::class, 'cancel']);
    });

    Route::prefix('stock-transfers')->group(function () {
        Route::middleware('has_permission:ver_transferencias')->group(function () {
            Route::get('/', [StockTransferController::class, 'index']);
            Route::get('/{id}', [StockTransferController::class, 'show']);
        });

        Route::middleware('has_permission:crear_transferencias')->post('/', [StockTransferController::class, 'store']);
        Route::middleware('has_permission:editar_transferencias')->group(function () {
            Route::put('/{id}', [StockTransferController::class, 'update']);
            Route::delete('/{id}', [StockTransferController::class, 'destroy']); // Borrador
        });

        Route::middleware('has_permission:completar_transferencias')->patch('/{id}/complete', [StockTransferController::class, 'complete']);
        Route::middleware('has_permission:cancelar_transferencias')->patch('/{id}/cancel', [StockTransferController::class, 'cancel']);
    });

    Route::prefix('settings')->group(function () {
        // Lectura de settings (solo requiere autenticación)
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/', [SettingController::class, 'index']);
            Route::get('/system', [SettingController::class, 'getSystem']); // Migrated
            // Generic key route at the end
            Route::get('/{key}', [SettingController::class, 'get']); // Migrated
        });

        Route::middleware('has_permission:editar_configuracion_sistema')->group(function () {
            Route::post('/', [SettingController::class, 'update']); // Was store/update
            Route::post('/logo', [SettingController::class, 'updateLogo']);
            Route::post('/upload-image', [SettingController::class, 'uploadImage']); // Migrated
            Route::put('/system', [SettingController::class, 'updateSystem']); // Migrated
        });

        // Ruta pública sin autenticación (para login page, etc.)
        Route::get('/public', [SettingController::class, 'getPublicSettings'])->withoutMiddleware(['auth:sanctum']);
    });

    Route::prefix('ivas')->group(function () {
        // Lectura de IVAs: cualquier usuario que pueda ver productos
        Route::middleware('has_permission:ver_productos')->group(function () {
            Route::get('/', [IvaController::class, 'index']);
            Route::get('/{id}', [IvaController::class, 'show']);
        });
        // Escritura: solo configuración del sistema
        Route::middleware('has_permission:editar_configuracion_sistema')->group(function () {
            Route::post('/', [IvaController::class, 'store']);
            Route::put('/{id}', [IvaController::class, 'update']);
            Route::delete('/{id}', [IvaController::class, 'destroy']);
        });
    });

    Route::prefix('stocks')->group(function () {
        // Lectura de stock (solo requiere autenticación, no permiso específico)
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/', [StockController::class, 'index']);
            Route::get('/{id}', [StockController::class, 'show']);
            Route::post('/by-product-branch', [StockController::class, 'getByProductAndBranch']);
        });

        Route::middleware('has_permission:ajustar_stock')->group(function () {
            Route::post('/', [StockController::class, 'store']);
            // Use route-model binding for update to match controller signature (Stock $stock)
            Route::put('/{stock}', [StockController::class, 'update']);
            Route::delete('/{id}', [StockController::class, 'destroy']);
            Route::post('/reduce', [StockController::class, 'reduceStock']);
        });

        Route::middleware('has_permission:actualizar_stock')->patch('/{id}/quantity', [StockController::class, 'updateQuantity']);
    });

    Route::prefix('users')->group(function () {
        Route::middleware('has_permission:ver_usuarios|ver_envios|crear_envios|editar_envios')->get('/transporters', [UserController::class, 'getTransporters']);

        Route::middleware('has_permission:ver_usuarios')->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::get('/check-username/{username}', [UserController::class, 'checkUsername']);
            Route::get('/check-email/{email}', [UserController::class, 'checkEmail']);
            Route::get('/check-name/{firstName}/{lastName}', [UserController::class, 'checkName']);
            Route::get('/{id}', [UserController::class, 'show']);
            Route::get('/{id}/branches', [UserController::class, 'userBranches']);
        });

        Route::middleware('has_permission:crear_usuarios')->post('/', [UserController::class, 'store']);
        Route::middleware('has_permission:editar_usuarios')->put('/{id}', [UserController::class, 'update']);
        Route::middleware('has_permission:eliminar_usuarios')->delete('/{id}', [UserController::class, 'destroy']);

        Route::middleware('has_permission:editar_usuarios')->put('/{id}/branches', [UserController::class, 'updateUserBranches']);

        Route::middleware('has_permission:ver_estadisticas_usuario')->group(function () {
            Route::get('/{id}/sales', [UserController::class, 'getUserSales']);
            Route::get('/{id}/sales/statistics', [UserController::class, 'getUserSalesStatistics']);
            Route::get('/{id}/sales/daily', [UserController::class, 'getUserDailySales']);
            Route::get('/{id}/sales/monthly', [UserController::class, 'getUserMonthlySales']);
            Route::get('/{id}/sales/top-products', [UserController::class, 'getUserTopProducts']);
        });
    });

    Route::prefix('roles')->group(function () {
        Route::middleware('has_permission:ver_roles')->group(function () {
            Route::get('/permissions-count', [RoleController::class, 'getPermissionsCountByRole']);
            Route::get('/permissions', [PermissionController::class, 'index']); // O ver_permisos
            Route::get('/check-name/{name}', [RoleController::class, 'checkName']);
            Route::get('/', [RoleController::class, 'index']);
            Route::get('/{id}', [RoleController::class, 'show']);
            Route::middleware('has_permission:ver_permisos')->get('/{id}/permissions', [RoleController::class, 'getRolePermissions']);
        });

        Route::middleware('has_permission:crear_roles')->post('/', [RoleController::class, 'store']);
        Route::middleware('has_permission:editar_roles')->put('/{id}', [RoleController::class, 'update']);
        Route::middleware('has_permission:eliminar_roles')->delete('/{id}', [RoleController::class, 'destroy']);

        Route::middleware('has_permission:asignar_permisos')->put('/{id}/permissions', [RoleController::class, 'setRolePermissions']);
    });

    Route::prefix('customers')->group(function () {
        // Lectura de clientes (solo requiere autenticación)
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/', [CustomerController::class, 'index']);
            Route::get('/check-name/{firstName}/{lastName}', [CustomerController::class, 'checkName']);
            Route::get('/{id}', [CustomerController::class, 'show']);
            Route::get('/{id}/sales', [CustomerController::class, 'getCustomerSalesWithSummary']);
            Route::get('/{id}/current-account-balance', [CustomerController::class, 'getCurrentAccountBalance']);
        });

        Route::middleware('has_permission:crear_clientes')->post('/', [CustomerController::class, 'store']);
        Route::middleware('has_permission:editar_clientes')->put('/{id}', [CustomerController::class, 'update']);
        Route::middleware('has_permission:eliminar_clientes')->delete('/{id}', [CustomerController::class, 'destroy']);

        // Services routes linked to customers
        Route::prefix('{customerId}/services')->middleware('has_permission:ver_servicios')->group(function () {
            Route::get('/', [ApiClientServiceController::class, 'index']);
            Route::middleware('has_permission:editar_servicios')->post('/', [ApiClientServiceController::class, 'store']);
        });
    });

    Route::prefix('client-services')->middleware('has_permission:ver_servicios')->group(function () {
        // Stats route - must be before {id} routes
        Route::get('/stats', [ApiClientServiceController::class, 'stats']);
        Route::get('/customers-with-services', [ApiClientServiceController::class, 'customersWithServices']);

        // General access if needed, or mostly via customer
        Route::get('/', [ApiClientServiceController::class, 'index']);
        Route::get('/{clientService}', [ApiClientServiceController::class, 'show']);
        Route::get('/{clientService}/payments', [ApiClientServiceController::class, 'getPayments']);

        Route::middleware('has_permission:editar_servicios')->group(function () {
            Route::post('/', [ApiClientServiceController::class, 'store']);
            Route::put('/{clientService}', [ApiClientServiceController::class, 'update']);
            Route::delete('/{clientService}', [ApiClientServiceController::class, 'destroy']);
            Route::post('/{clientService}/renew', [ApiClientServiceController::class, 'renew']);
            Route::post('/{clientService}/payments', [ApiClientServiceController::class, 'storePayment']);
        });
    });

    // Service Types (Catalog)
    Route::prefix('service-types')->middleware('has_permission:ver_servicios')->group(function () {
        Route::get('/', [ServiceTypeController::class, 'index']);
        Route::get('/{serviceType}', [ServiceTypeController::class, 'show']);

        Route::middleware('has_permission:editar_servicios')->group(function () {
            Route::post('/', [ServiceTypeController::class, 'store']);
            Route::put('/{serviceType}', [ServiceTypeController::class, 'update']);
            Route::delete('/{serviceType}', [ServiceTypeController::class, 'destroy']);
        });
    });

    Route::prefix('document-types')->group(function () {
        Route::get('/', [DocumentTypeController::class, 'index']);
        Route::get('/{id}', [DocumentTypeController::class, 'show']);

        Route::middleware('has_permission:editar_configuracion_sistema')->group(function () {
            Route::post('/', [DocumentTypeController::class, 'store']);
            Route::put('/{id}', [DocumentTypeController::class, 'update']);
            Route::delete('/{id}', [DocumentTypeController::class, 'destroy']);
        });
    });

    Route::prefix('payment-methods')->group(function () {
        Route::middleware('has_permission:ver_metodos_pago')->group(function () {
            Route::get('/', [PaymentMethodController::class, 'index']);
            Route::get('/{id}', [PaymentMethodController::class, 'show']);
        });

        Route::middleware('has_permission:crear_metodos_pago')->post('/', [PaymentMethodController::class, 'store']);
        Route::middleware('has_permission:editar_metodos_pago')->put('/{id}', [PaymentMethodController::class, 'update']);
        Route::middleware('has_permission:eliminar_metodos_pago')->delete('/{id}', [PaymentMethodController::class, 'destroy']);
    });

    Route::prefix('fiscal-conditions')->group(function () {
        Route::get('/', [ConfigController::class, 'getFiscalConditions']);
    });

    Route::prefix('receipt-types')->group(function () {
        Route::get('/', [ConfigController::class, 'getReceiptTypes']);
    });

    Route::prefix('sales')->group(function () {
        Route::middleware('has_permission:ver_ventas')->group(function () {
            Route::get('/', [SaleController::class, 'index']);
            Route::get('/summary', [SaleController::class, 'summary']);
            Route::get('/summary/all-branches', [SaleController::class, 'summaryAllBranches']);
            Route::get('/sold-products-for-transfer', [SaleController::class, 'getSoldProductsForTransfer']);
            Route::get('/{id}', [SaleController::class, 'show'])->whereNumber('id');
            Route::get('/download-pdf/{id}', [SaleController::class, 'downloadPdf'])->whereNumber('id');
            Route::get('/history/branch/{branchId}', [SaleController::class, 'salesHistoryByBranch'])->whereNumber('branchId');
            Route::get('/global', [SaleController::class, 'indexGlobal']);
            Route::get('/global/summary', [SaleController::class, 'summaryGlobal']);
            Route::get('/global/history', [SaleController::class, 'historyGlobal']);
        });

        // Rutas que requieren caja abierta
        Route::middleware('cash.open')->group(function () {
            Route::middleware('has_permission:crear_ventas')->post('/', [SaleController::class, 'store']);
            Route::middleware('has_permission:crear_ventas')->put('/{id}', [SaleController::class, 'update'])->whereNumber('id');
            // Nota de Crédito
            Route::middleware('has_permission:crear_ventas')->post('/{id}/credit-note', [SaleController::class, 'emitCreditNote'])->whereNumber('id');
        });

        Route::middleware('has_permission:anular_ventas')->delete('/{id}', [SaleController::class, 'destroy'])->whereNumber('id');
        Route::middleware('has_permission:anular_ventas')->post('/{id}/annul', [SaleAnnulmentController::class, 'annulSale'])->whereNumber('id');
        Route::middleware('has_permission:crear_ventas')->post('/{id}/authorize-afip', [SaleController::class, 'authorizeWithAfip'])->whereNumber('id');
    });

    // Budget (Presupuesto) Routes
    Route::prefix('budgets')->middleware('has_permission:ver_ventas|crear_ventas')->group(function () {
        Route::get('/', [SaleController::class, 'budgets']);
        Route::post('/{id}/convert', [SaleController::class, 'convertBudget'])->whereNumber('id');
        Route::patch('/{id}/approve', [SaleController::class, 'approve'])->whereNumber('id');
        Route::delete('/{id}', [SaleController::class, 'deleteBudget'])->whereNumber('id');
    });

    // Cash Register Routes
    Route::prefix('cash-registers')->group(function () {
        Route::middleware('has_permission:ver_movimientos_caja')->get('/', [CashRegisterController::class, 'index']);

        Route::middleware('has_permission:abrir_cerrar_caja')->group(function () {
            Route::post('/open', [CashRegisterController::class, 'open']);
            Route::post('/{id}/close', [CashRegisterController::class, 'close']);
        });

        Route::get('/current', [CashRegisterController::class, 'current']);
        Route::get('/current-optimized', [CashRegisterController::class, 'currentOptimized']);
        Route::get('/last-closure', [CashRegisterController::class, 'getLastClosure']);
        Route::get('/multiple-branches', [CashRegisterController::class, 'multipleBranches']);

        // Estos endpoints son necesarios para validar el estado de la caja antes de operaciones
        // como ventas, por lo que deben estar disponibles para todos los usuarios autenticados
        Route::get('/check-status', [CashRegisterController::class, 'checkStatus']);
        Route::get('/check-multiple-branches-status', [CashRegisterController::class, 'checkMultipleBranchesStatus']);

        Route::middleware('has_permission:ver_historico_caja')->group(function () {
            Route::get('/cash-registers-history', [CashRegisterController::class, 'cashRegistersHistory']);
            Route::get('/payment-methods-optimized', [CashRegisterController::class, 'getPaymentMethodsOptimized']);
            Route::get('/history', [CashRegisterController::class, 'history']);
            Route::get('/transactions/history', [CashRegisterController::class, 'transactionsHistory']);

            // Reports
            Route::get('/reports/movements', [CashRegisterController::class, 'reportsMovements']);
            Route::get('/reports/closures', [CashRegisterController::class, 'reportsClosures']);
            Route::get('/reports/financial', [CashRegisterController::class, 'reportsFinancial']);
            Route::get('/export', [CashRegisterController::class, 'export']);

            Route::get('/{id}', [CashRegisterController::class, 'show']);
        });
    });

    // Cash Movement Routes
    Route::prefix('cash-movements')->group(function () {
        Route::middleware('has_permission:ver_movimientos_caja')->group(function () {
            Route::get('/', [CashMovementController::class, 'index']);
            Route::get('/{id}', [CashMovementController::class, 'show']);
        });
        Route::middleware('has_permission:crear_movimientos_caja')->post('/', [CashMovementController::class, 'store']);
        Route::middleware('has_permission:eliminar_movimientos_caja')->delete('/{id}', [CashMovementController::class, 'destroy']);
    });

    // Current Account Routes
    Route::prefix('current-accounts')->middleware('has_permission:gestionar_cuentas_corrientes')->group(function () {
        // CRUD básico
        Route::get('/', [CurrentAccountController::class, 'index']);
        Route::post('/', [CurrentAccountController::class, 'store']);

        // Consultas específicas ANTES de las rutas dinámicas {id}
        Route::get('/customer/{customerId}', [CurrentAccountController::class, 'getByCustomer']);
        Route::get('/status/{status}', [CurrentAccountController::class, 'getByStatus']);
        Route::get('/at-credit-limit', [CurrentAccountController::class, 'getAtCreditLimit']);
        Route::get('/overdrawn', [CurrentAccountController::class, 'getOverdrawn']);

        // Estadísticas generales (sin parámetro dinámico)
        Route::get('/statistics/general', [CurrentAccountController::class, 'generalStatistics']);
        Route::get('/reports/generate', [CurrentAccountController::class, 'generateReport']);

        // Rutas con {id} o {accountId} - DEBEN ir DESPUÉS de las rutas específicas
        Route::get('/{id}', [CurrentAccountController::class, 'show']);
        Route::put('/{id}', [CurrentAccountController::class, 'update']);
        Route::delete('/{id}', [CurrentAccountController::class, 'destroy']);

        // Gestión de estado
        Route::patch('/{id}/suspend', [CurrentAccountController::class, 'suspend']);
        Route::patch('/{id}/reactivate', [CurrentAccountController::class, 'reactivate']);
        Route::patch('/{id}/close', [CurrentAccountController::class, 'close']);

        // Movimientos
        Route::get('/{accountId}/movements', [CurrentAccountController::class, 'movements']);
        Route::get('/{accountId}/movement-filters', [CurrentAccountController::class, 'movementFilters']);
        Route::post('/movements', [CurrentAccountController::class, 'createMovement']);
        Route::get('/{accountId}/balance', [CurrentAccountController::class, 'balance']);
        Route::get('/{accountId}/pending-sales', [CurrentAccountController::class, 'pendingSales']);

        // Operaciones financieras
        Route::post('/{accountId}/payments', [CurrentAccountController::class, 'processPayment']);
        Route::post('/{accountId}/credit-purchases', [CurrentAccountController::class, 'processCreditPurchase']);
        Route::post('/{accountId}/check-credit', [CurrentAccountController::class, 'checkAvailableCredit']);

        // Gestión de límites
        Route::patch('/{accountId}/credit-limit', [CurrentAccountController::class, 'updateCreditLimit']);

        // Actualización de precios de ventas pendientes
        Route::get('/{accountId}/sales/{saleId}/price-preview', [CurrentAccountController::class, 'previewSalePriceUpdate']);
        Route::post('/{accountId}/sales/{saleId}/update-price', [CurrentAccountController::class, 'updateSalePrice']);
        Route::get('/{accountId}/sales/batch-price-preview', [CurrentAccountController::class, 'previewBatchPriceUpdate']);

        // Estadísticas y reportes (con parámetro)
        Route::get('/{accountId}/statistics', [CurrentAccountController::class, 'statistics']);
        Route::get('/{accountId}/export-movements', [CurrentAccountController::class, 'exportMovements']);
        Route::post('/{accountId}/supplier-payments', [CurrentAccountController::class, 'processSupplierPayment']);
    });

    // Rutas globales para actualización masiva de precios (todas las cuentas)
    Route::prefix('sales')->middleware('has_permission:gestionar_cuentas_corrientes')->group(function () {
        Route::get('/batch-price-preview', [CurrentAccountController::class, 'previewGlobalBatchPriceUpdate']);
        Route::post('/batch-update-prices', [CurrentAccountController::class, 'batchUpdatePrices']);
    });

    Route::prefix('movement-types')->middleware('has_permission:crear_movimientos_caja')->group(function () {
        Route::get('/', [MovementTypeController::class, 'index']);
        Route::get('/{id}', [MovementTypeController::class, 'show']);
        Route::middleware('has_permission:editar_configuracion_sistema')->group(function () {
            Route::post('/', [MovementTypeController::class, 'store']);
            Route::put('/{id}', [MovementTypeController::class, 'update']);
            Route::delete('/{id}', [MovementTypeController::class, 'destroy']);
        });
    });

    // Dashboard Routes
    Route::prefix('dashboard')->group(function () {
        Route::middleware('has_permission:ver_ventas')->get('/sales-summary', [DashboardController::class, 'getSalesSummary']);
        Route::middleware('has_permission:ver_stock')->get('/stock-alerts', [DashboardController::class, 'getStockAlerts']);
        Route::middleware('has_permission:ver_ventas')->get('/sales-by-branch', [DashboardController::class, 'getSalesByBranch']);
        Route::middleware('has_permission:ver_ventas')->get('/monthly-sales', [DashboardController::class, 'getMonthlySales']);
        Route::middleware('has_permission:ver_estadisticas')->get('/general-stats', [DashboardController::class, 'getGeneralStats']);
    });

    // Statistics Routes
    Route::prefix('statistics')->middleware('has_permission:ver_estadisticas')->group(function () {
        Route::get('/general', [StatisticsController::class, 'general']);
        Route::get('/sales-by-product', [StatisticsController::class, 'salesByProduct']);
        Route::get('/top-products', [StatisticsController::class, 'topProducts']);

        // Advanced statistics
        Route::get('/advanced', [StatisticsController::class, 'advancedStats']);
        Route::get('/by-user', [StatisticsController::class, 'salesByUser']);
        Route::get('/by-category', [StatisticsController::class, 'salesByCategory']);
        Route::get('/by-supplier', [StatisticsController::class, 'salesBySupplier']);
        Route::get('/by-hour', [StatisticsController::class, 'salesByHour']);
        Route::get('/by-payment-method', [StatisticsController::class, 'salesByPaymentMethod']);
        Route::get('/by-day-of-week', [StatisticsController::class, 'salesByDayOfWeek']);
        Route::get('/daily-trend', [StatisticsController::class, 'salesDailyTrend']);
        Route::get('/top-products-advanced', [StatisticsController::class, 'topProductsAdvanced']);
    });

    // Financial Reports Routes
    Route::prefix('financial-reports')->middleware('has_permission:generar_reportes')->group(function () {
        Route::get('/summary', [FinancialReportController::class, 'getSummary']);
        Route::get('/movements-detail', [FinancialReportController::class, 'getMovementsDetail']);
        Route::get('/daily-breakdown', [FinancialReportController::class, 'getDailyBreakdown']);
    });

    // Repairs Routes
    Route::prefix('repairs')->group(function () {
        Route::middleware('has_permission:ver_reparaciones')->group(function () {
            Route::get('/', [RepairController::class, 'index']);
            Route::get('/stats', [RepairController::class, 'stats']);
            Route::get('/options', [RepairController::class, 'options']);
            Route::get('/kanban', [RepairController::class, 'kanban']);
            Route::get('/{id}', [RepairController::class, 'show'])->whereNumber('id');
            Route::get('/{id}/pdf', [RepairController::class, 'generatePdf'])->whereNumber('id');
            Route::get('/{id}/reception-certificate', [RepairController::class, 'receptionCertificate'])->whereNumber('id');
            Route::get('/{id}/no-repair-certificate', [RepairController::class, 'noRepairCertificate'])->whereNumber('id');
        });

        Route::middleware('has_permission:crear_reparaciones')->post('/', [RepairController::class, 'store']);

        Route::middleware('has_permission:editar_reparaciones')->group(function () {
            Route::put('/{id}', [RepairController::class, 'update'])->whereNumber('id');
            Route::patch('/{id}/status', [RepairController::class, 'updateStatus'])->whereNumber('id');
            Route::patch('/{id}/assign', [RepairController::class, 'assign'])->whereNumber('id');
            Route::post('/{id}/notes', [RepairController::class, 'addNote'])->whereNumber('id');
            Route::post('/{id}/mark-as-paid', [RepairController::class, 'markAsPaid'])->whereNumber('id');
            Route::post('/{id}/no-repair', [RepairController::class, 'markNoRepair'])->whereNumber('id');
        });
    });

    // Insurers (Aseguradoras) Routes
    Route::prefix('insurers')->group(function () {
        Route::middleware('has_permission:ver_reparaciones')->group(function () {
            Route::get('/', [\App\Http\Controllers\InsurerController::class, 'index']);
            Route::get('/{insurer}', [\App\Http\Controllers\InsurerController::class, 'show']);
        });

        Route::middleware('has_permission:editar_reparaciones')->group(function () {
            Route::post('/', [\App\Http\Controllers\InsurerController::class, 'store']);
            Route::put('/{insurer}', [\App\Http\Controllers\InsurerController::class, 'update']);
            Route::delete('/{insurer}', [\App\Http\Controllers\InsurerController::class, 'destroy']);
        });
    });

    // Combos Routes
    Route::prefix('combos')->group(function () {
        // Lectura de combos (sin permisos específicos requeridos)
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/', [ComboController::class, 'index']);
            Route::get('/statistics', [ComboController::class, 'statistics']);
            Route::get('/available-in-branch', [ComboController::class, 'getAvailableInBranch']);
            Route::get('/{combo}', [ComboController::class, 'show']);
            Route::get('/{combo}/calculate-price', [ComboController::class, 'calculatePrice']);
            Route::post('/{combo}/check-availability', [ComboController::class, 'checkAvailability']);
        });

        Route::middleware('has_permission:crear_combos')->post('/', [ComboController::class, 'store']);
        Route::middleware('has_permission:editar_combos')->put('/{combo}', [ComboController::class, 'update']);
        Route::middleware('has_permission:eliminar_combos')->delete('/{combo}', [ComboController::class, 'destroy']);
    });

    // Shipments Routes
    Route::prefix('shipments')->group(function () {
        Route::middleware('has_permission:ver_envios')->group(function () {
            Route::get('/', [ShipmentController::class, 'index']);
            Route::get('/multiple-branches', [ShipmentController::class, 'multipleBranches']);
            Route::get('/{id}/pdf', [ShipmentController::class, 'downloadPdf'])->whereNumber('id');
            Route::get('/{id}', [ShipmentController::class, 'show']);
        });

        Route::middleware('has_permission:crear_envios')->post('/', [ShipmentController::class, 'store']);
        Route::middleware('has_permission:editar_envios')->put('/{id}', [ShipmentController::class, 'update']);
        Route::middleware('has_permission:editar_envios')->delete('/{id}', [ShipmentController::class, 'destroy']); // Usamos editar_envios

        Route::middleware('has_permission:editar_envios')->patch('/{id}/move', [ShipmentController::class, 'move']);

        Route::post('/{id}/webhook', [ShipmentController::class, 'webhook']);
        Route::middleware('has_permission:editar_envios')->post('/{id}/pay', [ShipmentController::class, 'pay']);
    });

    // Shipment Stages Routes
    Route::prefix('shipment-stages')->group(function () {
        Route::middleware('has_permission:ver_envios')->get('/', [ShipmentController::class, 'stages']);

        Route::middleware('has_permission:editar_envios')->group(function () {
            Route::post('/', [ShipmentController::class, 'upsertStage']);
            Route::delete('/{id}', [ShipmentController::class, 'deleteStage']);
        });

        Route::middleware('has_permission:editar_configuracion_sistema')->post('/visibility', [ShipmentController::class, 'configureVisibility']);
    });

    // Audit Routes - Rate limited to 60 requests per minute
    Route::prefix('audits')->middleware(['throttle:60,1', 'has_permission:ver_auditorias'])->group(function () {
        Route::get('/', [AuditController::class, 'index']);
        Route::get('/statistics', [AuditController::class, 'statistics']);
        Route::get('/filter-options', [AuditController::class, 'filterOptions']);
        Route::get('/{id}', [AuditController::class, 'show']);
        Route::get('/user/{userId}', [AuditController::class, 'getUserAudits']);
        Route::get('/model/{subjectType}/{subjectId}', [AuditController::class, 'getModelAudits']);
    });

    // Expenses Module Routes
    Route::prefix('expenses')->group(function () {
        Route::middleware('has_permission:ver_gastos')->group(function () {
            Route::get('/', [ExpenseController::class, 'index']);
            Route::get('/stats', [ExpenseController::class, 'stats']);
            Route::get('/{id}', [ExpenseController::class, 'show']);
            Route::get('/recent', [ExpenseController::class, 'recent']);
        });
        // Route::get('/recent', [ExpenseController::class, 'recent']); Moved inside

        Route::middleware('has_permission:crear_gastos')->post('/', [ExpenseController::class, 'store']);
        Route::middleware('has_permission:editar_gastos')->put('/{id}', [ExpenseController::class, 'update']);
        Route::middleware('has_permission:eliminar_gastos')->delete('/{id}', [ExpenseController::class, 'destroy']);
    });

    // Expense Reminders Module Routes
    Route::prefix('expense-reminders')->middleware('has_permission:ver_gastos')->group(function () {
        Route::get('/', [ExpenseReminderController::class, 'index']);
        Route::get('/pending', [ExpenseReminderController::class, 'pending']);
        Route::get('/stats', [ExpenseReminderController::class, 'stats']);
        Route::get('/{expenseReminder}', [ExpenseReminderController::class, 'show']);
        Route::post('/{expenseReminder}/dismiss', [ExpenseReminderController::class, 'dismiss']);
    });

    Route::prefix('employees')->group(function () {
        Route::middleware('has_permission:ver_empleados')->group(function () {
            Route::get('/', [EmployeeController::class, 'index']);
            Route::get('/{id}', [EmployeeController::class, 'show']);
            Route::get('/available-users', [EmployeeController::class, 'availableUsers']);
        });
        // Route::get('/available-users', [EmployeeController::class, 'availableUsers']); Moved inside

        Route::middleware('has_permission:crear_empleados')->post('/', [EmployeeController::class, 'store']);
        Route::middleware('has_permission:editar_empleados')->put('/{id}', [EmployeeController::class, 'update']);
        Route::middleware('has_permission:eliminar_empleados')->delete('/{id}', [EmployeeController::class, 'destroy']);
    });

    Route::prefix('expense-categories')->group(function () {
        Route::middleware('has_permission:ver_categorias_gastos')->group(function () {
            Route::get('/tree', [ExpenseCategoryController::class, 'tree']);
            Route::get('/', [ExpenseCategoryController::class, 'index']);
            Route::get('/{id}', [ExpenseCategoryController::class, 'show']);
        });

        Route::middleware('has_permission:crear_categorias_gastos')->post('/', [ExpenseCategoryController::class, 'store']);
        Route::middleware('has_permission:editar_categorias_gastos')->put('/{id}', [ExpenseCategoryController::class, 'update']);
        Route::middleware('has_permission:eliminar_categorias_gastos')->delete('/{id}', [ExpenseCategoryController::class, 'destroy']);
    });

    // Superadmin Routes
    // Superadmin Routes
    // Route::middleware('superadmin')->prefix('admin')->group(function () {
    //     Route::apiResource('plans', \App\Http\Controllers\PlanController::class);
    //     Route::apiResource('tenants', \App\Http\Controllers\TenantController::class)->only(['index', 'show', 'update']);
    // });

    // Tenant Subscription Route
    // Route::get('/subscription', [\App\Http\Controllers\TenantController::class, 'mySubscription']);

});
