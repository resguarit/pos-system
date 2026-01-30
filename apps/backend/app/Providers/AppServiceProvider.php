<?php

namespace App\Providers;

use App\Models\Branch;
use App\Interfaces\BranchServiceInterface;
use App\Interfaces\CategoryServiceInterface;
use App\Interfaces\IvaServiceInterface;
use App\Interfaces\MeasureServiceInterface;
use App\Interfaces\ProductServiceInterface;
use App\Interfaces\StockServiceInterface;
use App\Interfaces\SupplierServiceInterface;
use App\Interfaces\CustomerServiceInterface;
use App\Interfaces\UserServiceInterface;
use App\Interfaces\PersonServiceInterface;
use App\Interfaces\RoleServiceInterface;
use App\Interfaces\PermissionServiceInterface;
use App\Interfaces\SaleServiceInterface;
use App\Services\BranchService;
use App\Services\CategoryService;
use App\Services\IvaService;
use App\Services\MeasureService;
use App\Services\ProductService;
use App\Services\StockService;
use App\Services\SupplierService;
use App\Services\UserService;
use App\Services\CustomerService;
use App\Services\PersonService;
use App\Services\RoleService;
use App\Services\PermissionService;
use App\Services\SaleService;
use App\Services\DocumentTypeService;
use App\Interfaces\DocumentTypeServiceInterface;
use App\Interfaces\PaymentMethodServiceInterface;
use App\Interfaces\PurchaseOrderServiceInterface;
use App\Services\PaymentMethodService;
use App\Services\PurchaseOrderService;
use Illuminate\Support\Facades\Event;
use Illuminate\Database\Events\ModelEvent;
use Illuminate\Support\ServiceProvider;
use Spatie\Activitylog\ActivityLogger;
use Spatie\Activitylog\ActivityLogStatus;
use App\Interfaces\FiscalConditionServiceInterface;
use App\Services\FiscalConditionService;
use App\Interfaces\RepairServiceInterface;
use App\Services\RepairService;
use App\Interfaces\ShipmentServiceInterface;
use App\Services\ShipmentService;
use App\Interfaces\ShipmentStageServiceInterface;
use App\Services\ShipmentStageService;
use App\Interfaces\ProductCostHistoryServiceInterface;
use App\Services\ProductCostHistoryService;
use App\Services\SearchService;
use App\Interfaces\StockTransferServiceInterface;
use App\Services\StockTransferService;
use Illuminate\Database\Eloquent\Relations\Relation;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // SDK AFIP ahora maneja SSL automáticamente (v2.x+)
        // Ya no necesitamos CustomWsfeService ni CustomWsPadronService

        // Registrar los bindings de las interfaces con sus implementaciones
        $this->app->bind(\App\Interfaces\BranchServiceInterface::class, \App\Services\BranchService::class);
        $this->app->bind(\App\Interfaces\CategoryServiceInterface::class, \App\Services\CategoryService::class);
        $this->app->bind(\App\Interfaces\IvaServiceInterface::class, \App\Services\IvaService::class);
        $this->app->bind(\App\Interfaces\MeasureServiceInterface::class, \App\Services\MeasureService::class);
        $this->app->bind(\App\Interfaces\ProductServiceInterface::class, \App\Services\ProductService::class);
        $this->app->bind(\App\Interfaces\StockServiceInterface::class, \App\Services\StockService::class);
        $this->app->bind(\App\Interfaces\SupplierServiceInterface::class, \App\Services\SupplierService::class);
        $this->app->bind(\App\Interfaces\CustomerServiceInterface::class, \App\Services\CustomerService::class);
        $this->app->bind(\App\Interfaces\UserServiceInterface::class, \App\Services\UserService::class);
        $this->app->bind(\App\Interfaces\PersonServiceInterface::class, \App\Services\PersonService::class);
        $this->app->bind(\App\Interfaces\RoleServiceInterface::class, \App\Services\RoleService::class);
        $this->app->bind(\App\Interfaces\PermissionServiceInterface::class, \App\Services\PermissionService::class);
        $this->app->bind(\App\Interfaces\DocumentTypeServiceInterface::class, \App\Services\DocumentTypeService::class);
        $this->app->bind(\App\Interfaces\PaymentMethodServiceInterface::class, \App\Services\PaymentMethodService::class);
        $this->app->bind(\App\Interfaces\SaleServiceInterface::class, \App\Services\SaleService::class);
        $this->app->bind(\App\Interfaces\PurchaseOrderServiceInterface::class, \App\Services\PurchaseOrderService::class);
        $this->app->bind(\App\Interfaces\FiscalConditionServiceInterface::class, \App\Services\FiscalConditionService::class);

        // Cash System Bindings
        $this->app->bind(\App\Interfaces\CashRegisterServiceInterface::class, \App\Services\CashRegisterService::class);
        $this->app->bind(\App\Interfaces\CashMovementServiceInterface::class, \App\Services\CashMovementService::class);
        $this->app->bind(\App\Interfaces\CurrentAccountServiceInterface::class, \App\Services\CurrentAccountService::class);

        // Repairs bindings
        $this->app->bind(RepairServiceInterface::class, RepairService::class);

        // Shipment bindings
        $this->app->bind(ShipmentServiceInterface::class, ShipmentService::class);
        $this->app->bind(ShipmentStageServiceInterface::class, ShipmentStageService::class);

        // Product Cost History binding
        $this->app->bind(ProductCostHistoryServiceInterface::class, ProductCostHistoryService::class);

        // Stock Transfer binding
        $this->app->bind(StockTransferServiceInterface::class, StockTransferService::class);

        // Search Service binding
        $this->app->singleton(SearchService::class);

        // Audit Service binding
        $this->app->bind(\App\Interfaces\AuditServiceInterface::class, \App\Services\AuditService::class);

        // Override Afip SDK ReceiptRenderer to use local templates (custom path)
        $this->app->singleton(\Resguar\AfipSdk\Services\ReceiptRenderer::class, function ($app) {
            // Using resource_path because we stored templates in resources/templates/afip
            return new \Resguar\AfipSdk\Services\ReceiptRenderer(resource_path('templates/afip'));
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Map polymorphic types so 'sale' resolves to the SaleHeader model
        Relation::morphMap([
            'sale' => \App\Models\SaleHeader::class,
            'expense' => \App\Models\Expense::class,
            'purchase_order' => \App\Models\PurchaseOrder::class,
            'sale_annulment' => \App\Models\SaleHeader::class,
            'shipment' => \App\Models\Shipment::class,
            'current_account_movement' => \App\Models\CurrentAccountMovement::class,
        ]);


        Event::listen(ModelEvent::class, function (ModelEvent $event) {
            $model = $event->model;

            // Solo registrar si el modelo usa LogsActivity trait
            // El trait LogsActivity ya maneja el logging automáticamente,
            // pero aquí agregamos información adicional como IP, user agent, etc.
            $usesLogsActivity = in_array(
                \Spatie\Activitylog\Traits\LogsActivity::class,
                class_uses_recursive($model)
            );

            // También registrar modelos importantes aunque no usen el trait directamente
            $importantModels = [
                \App\Models\Branch::class,
                \App\Models\Product::class,
                \App\Models\SaleHeader::class,
                \App\Models\PurchaseOrder::class,
                \App\Models\Customer::class,
                \App\Models\Supplier::class,
                \App\Models\User::class,
                \App\Models\Stock::class,
                \App\Models\Category::class,
                \App\Models\CashMovement::class,
                \App\Models\CashRegister::class,
                \App\Models\CurrentAccountMovement::class,
            ];

            $isImportantModel = in_array(get_class($model), $importantModels);

            // Solo registrar si el modelo usa LogsActivity o es importante Y hay un usuario autenticado
            if (($usesLogsActivity || $isImportantModel) && auth()->check()) {
                // El trait LogsActivity ya registra la actividad automáticamente,
                // pero podemos agregar información adicional si es necesario
                // Nota: La información adicional (IP, user agent, etc.) se puede agregar
                // mediante un tap en el modelo o aquí, pero el trait ya lo maneja bien
            }
        });
    }

    /**
     * Obtener la descripción del evento
     */
    protected function getEventDescription(ModelEvent $event): string
    {
        $model = $event->model;
        $eventType = $this->getEventType($event);

        return sprintf(
            '%s %s %s',
            $eventType,
            class_basename($model),
            $model->id
        );
    }

    /**
     * Obtener el tipo de evento
     */
    protected function getEventType(ModelEvent $event): string
    {
        return match (true) {
            $event->isCreating() => 'Creando',
            $event->isUpdating() => 'Actualizando',
            $event->isDeleting() => 'Eliminando',
            default => 'Modificando',
        };
    }
}
