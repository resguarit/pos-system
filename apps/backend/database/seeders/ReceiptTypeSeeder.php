<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ReceiptType;

class ReceiptTypeSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['afip_code' => '001', 'description' => 'Factura A'],
            ['afip_code' => '002', 'description' => 'Nota de Débito A'],
            ['afip_code' => '003', 'description' => 'Nota de Crédito A'],
            ['afip_code' => '004', 'description' => 'Recibo A'],
            ['afip_code' => '005', 'description' => 'Nota de Venta al Contado A'],
            ['afip_code' => '006', 'description' => 'Factura B'],
            ['afip_code' => '007', 'description' => 'Nota de Débito B'],
            ['afip_code' => '008', 'description' => 'Nota de Crédito B'],
            ['afip_code' => '009', 'description' => 'Recibo B'],
            ['afip_code' => '010', 'description' => 'Nota de Venta al Contado B'],
            ['afip_code' => '011', 'description' => 'Factura C'],
            ['afip_code' => '012', 'description' => 'Nota de Débito C'],
            ['afip_code' => '013', 'description' => 'Nota de Crédito C'],
            ['afip_code' => '015', 'description' => 'Recibo C'],
            ['afip_code' => '049', 'description' => 'Factura M'],
            ['afip_code' => '050', 'description' => 'Nota de Débito M'],
            ['afip_code' => '051', 'description' => 'Nota de Crédito M'],
            ['afip_code' => '052', 'description' => 'Recibo M'],
            ['afip_code' => '016', 'description' => 'Presupuesto'],
            ['afip_code' => '017', 'description' => 'Factura X'],
        ];
        foreach ($data as $item) {
            ReceiptType::updateOrCreate(['afip_code' => $item['afip_code']], $item);
        }
    }
}
