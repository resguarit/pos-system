<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentMethod;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            ['name' => 'Efectivo', 'description' => 'Pago en efectivo', 'affects_cash' => true, 'is_customer_credit' => false],
            ['name' => 'Tarjeta de crédito', 'description' => 'Pago con tarjeta de crédito', 'affects_cash' => true, 'is_customer_credit' => false],
            ['name' => 'Tarjeta de débito', 'description' => 'Pago con tarjeta de débito', 'affects_cash' => true, 'is_customer_credit' => false],
            ['name' => 'Transferencia', 'description' => 'Pago por transferencia bancaria', 'affects_cash' => true, 'is_customer_credit' => false],
            ['name' => 'Cuenta Corriente', 'description' => 'Venta a cuenta corriente del cliente', 'affects_cash' => false, 'is_customer_credit' => true],
        ];
        foreach ($methods as $method) {
            PaymentMethod::updateOrCreate(['name' => $method['name']], $method);
        }
    }
}
