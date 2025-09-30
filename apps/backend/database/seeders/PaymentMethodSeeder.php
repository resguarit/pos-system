<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentMethod;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            ['name' => 'Efectivo', 'description' => 'Pago en efectivo'],
            ['name' => 'Tarjeta de crédito', 'description' => 'Pago con tarjeta de crédito'],
            ['name' => 'Tarjeta de débito', 'description' => 'Pago con tarjeta de débito'],
            ['name' => 'Transferencia', 'description' => 'Pago por transferencia bancaria'],
        ];
        foreach ($methods as $method) {
            PaymentMethod::updateOrCreate(['name' => $method['name']], $method);
        }
    }
}
