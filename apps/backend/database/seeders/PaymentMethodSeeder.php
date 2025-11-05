<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentMethod;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            ['name' => 'Efectivo', 'description' => 'Pago en efectivo', 'affects_cash' => true],
            ['name' => 'Tarjeta de crédito', 'description' => 'Pago con tarjeta de crédito', 'affects_cash' => true],
            ['name' => 'Tarjeta de débito', 'description' => 'Pago con tarjeta de débito', 'affects_cash' => true],
            ['name' => 'Transferencia', 'description' => 'Pago por transferencia bancaria', 'affects_cash' => true],
            ['name' => 'Cuenta Corriente', 'description' => 'Venta a cuenta corriente del cliente', 'affects_cash' => false],
            ['name' => 'Crédito a favor', 'description' => 'Uso de crédito a favor del cliente', 'affects_cash' => false],
        ];
        foreach ($methods as $method) {
            PaymentMethod::updateOrCreate(['name' => $method['name']], $method);
        }
    }
}
