<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class ProductionSeeder extends Seeder
{
    /**
     * Seeders esenciales para producción.
     * Estos datos son necesarios para el funcionamiento básico del sistema.
     */
    public function run(): void
    {
        if ($this->command) {
            $this->command->info('🌱 Ejecutando seeders de producción...');
        }
        
        // Configuraciones fiscales básicas
        $this->call([
            FiscalConditionSeeder::class,       // Condiciones fiscales (IVA, Exento, etc.)
            DocumentTypeSeeder::class,          // Tipos de documento (DNI, CUIT, etc.)
            PersonTypeSeeder::class,            // Tipos de persona (Física, Jurídica)
            ReceiptTypeSeeder::class,           // Tipos de comprobante (Factura A, B, C, etc.)
            OtherTaxesSeeder::class,            // Otros impuestos
            IvaSeeder::class,                   // Alícuotas de IVA (0%, 10.5%, 21%, 27%)
        ]);
        
        // Configuraciones de negocio
        $this->call([
            PaymentMethodSeeder::class,         // Métodos de pago (Efectivo, Tarjeta, etc.)
            MovementTypeSeeder::class,          // Tipos de movimiento para caja
            CurrentAccountMovementTypeSeeder::class, // Tipos de movimiento para cuentas corrientes (manuales)
            MeasureSeeder::class,               // Unidades de medida básicas
        ]);
        
        // Sistema de permisos y roles
        $this->call([
            RoleSeeder::class,                  // Roles básicos del sistema
            PermissionSeeder::class,            // Permisos del sistema
            PermissionRoleSeeder::class,        // Asignación de permisos a roles
        ]);
        
        // Usuario administrador básico
        $this->call([
            UserSeeder::class,                  // Usuario administrador básico
            RoleUserSeeder::class,              // Asignación de roles a usuarios
        ]);
        
        // Configuraciones de ventas
        $this->call([
            SaleIvaSeeder::class,              // Configuración de IVA para ventas
        ]);
        
        if ($this->command) {
            $this->command->info('✅ Seeders de producción completados');
        }
    }
}
