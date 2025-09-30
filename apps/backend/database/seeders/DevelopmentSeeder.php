<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DevelopmentSeeder extends Seeder
{
    /**
     * Seeders para desarrollo y testing.
     * Estos datos son ficticios y solo deben usarse en entornos de desarrollo.
     */
    public function run(): void
    {
        if ($this->command) {
            $this->command->info('🧪 Ejecutando seeders de desarrollo...');
        }
        
        // Catálogos básicos primero (sin dependencias)
        $this->call([
            FiscalConditionSeeder::class,       // Condiciones fiscales
            DocumentTypeSeeder::class,           // Tipos de documento
            PersonTypeSeeder::class,            // Tipos de persona
            MeasureSeeder::class,               // Unidades de medida
            IvaSeeder::class,                   // IVAs
            PaymentMethodSeeder::class,         // Métodos de pago
            ReceiptTypeSeeder::class,           // Tipos de comprobante
            MovementTypeSeeder::class,         // Tipos de movimiento
            OtherTaxesSeeder::class,            // Otros impuestos
        ]);
        
        // Datos de empresa/sucursales de prueba
        $this->call([
            BranchSeeder::class,                // Sucursales de prueba
        ]);
        
        // Catálogos de prueba
        $this->call([
            SupplierSeeder::class,              // Proveedores de prueba
            CategorySeeder::class,              // Categorías de prueba
        ]);
        
        // Roles y permisos
        $this->call([
            RoleSeeder::class,                  // Roles del sistema
            PermissionSeeder::class,           // Permisos del sistema
            PermissionRoleSeeder::class,       // Asignación de permisos a roles
        ]);
        
        // Usuarios y clientes de prueba
        $this->call([
            PersonSeeder::class,                // Personas de prueba
            UserSeeder::class,                  // Usuarios de prueba
            CustomerSeeder::class,              // Clientes de prueba
        ]);
        
        // Productos e inventario de prueba
        $this->call([
            ProductSeeder::class,               // Productos de prueba
            StockSeeder::class,                 // Stock de prueba
        ]);

        // Órdenes de compra de prueba
        $this->call([
            PurchaseOrderSeeder::class,         // Órdenes de compra de prueba
            PurchaseOrderItemSeeder::class,     // Items de órdenes de compra de prueba
        ]);
        
        // Ventas de prueba
        $this->call([
            SaleSeeder::class,                  // Ventas de prueba
            SaleItemSeeder::class,              // Items de ventas de prueba
            SalePaymentSeeder::class,          // Pagos de ventas de prueba
        ]);

        // Sistema de caja y cuentas corrientes de prueba
        $this->call([
            CashRegisterSeeder::class,          // Cajas registradoras de prueba
            CashMovementSeeder::class,          // Movimientos de caja de prueba
            CurrentAccountSeeder::class,        // Cuentas corrientes de prueba
            CurrentAccountMovementSeeder::class, // Movimientos de cuenta corriente de prueba
        ]);
        
        if ($this->command) {
            $this->command->info('✅ Seeders de desarrollo completados');
        }
    }
}
