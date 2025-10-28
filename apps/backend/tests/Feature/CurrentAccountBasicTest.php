<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\CurrentAccount;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CurrentAccountBasicTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function current_account_model_exists()
    {
        $this->assertTrue(class_exists(CurrentAccount::class));
    }

    /** @test */
    public function current_account_service_exists()
    {
        $this->assertTrue(class_exists(\App\Services\CurrentAccountService::class));
    }

    /** @test */
    public function current_account_controller_exists()
    {
        $this->assertTrue(class_exists(\App\Http\Controllers\CurrentAccountController::class));
    }

    /** @test */
    public function current_account_routes_are_defined()
    {
        $routes = \Route::getRoutes();
        $currentAccountRoutes = collect($routes)->filter(function ($route) {
            return str_contains($route->uri(), 'current-accounts');
        });

        $this->assertGreaterThan(0, $currentAccountRoutes->count(), 
            'No se encontraron rutas de current-accounts');
    }

    /** @test */
    public function current_account_permissions_exist()
    {
        $permissions = [
            'ver_cuentas_corrientes',
            'crear_cuentas_corrientes',
            'editar_cuentas_corrientes',
            'eliminar_cuentas_corrientes',
            'procesar_pagos_cuentas_corrientes',
            'procesar_compras_credito'
        ];

        foreach ($permissions as $permission) {
            $this->assertDatabaseHas('permissions', ['name' => $permission]);
        }
    }

    /** @test */
    public function current_account_migration_exists()
    {
        $migrationFiles = glob(database_path('migrations/*current_accounts*.php'));
        $this->assertGreaterThan(0, count($migrationFiles), 
            'No se encontraron migraciones para current_accounts');
    }

    /** @test */
    public function current_account_seeder_exists()
    {
        $this->assertTrue(class_exists(\Database\Seeders\CurrentAccountSeeder::class));
    }
}

