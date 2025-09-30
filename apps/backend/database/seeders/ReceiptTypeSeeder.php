<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ReceiptType;

class ReceiptTypeSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            // ['afip_code' => '001', 'description' => 'FACTURAS A'],
            // ['afip_code' => '002', 'description' => 'NOTAS DE DEBITO A'],
            // ['afip_code' => '003', 'description' => 'NOTAS DE CREDITO A'],
            // ['afip_code' => '004', 'description' => 'RECIBOS A'],
            // ['afip_code' => '005', 'description' => 'NOTAS DE VENTA AL CONTADO A'],
            // ['afip_code' => '006', 'description' => 'FACTURAS B'],
            // ['afip_code' => '007', 'description' => 'NOTAS DE DEBITO B'],
            // ['afip_code' => '008', 'description' => 'NOTAS DE CREDITO B'],
            // ['afip_code' => '009', 'description' => 'RECIBOS B'],
            // ['afip_code' => '010', 'description' => 'NOTAS DE VENTA AL CONTADO B'],
            // ['afip_code' => '011', 'description' => 'FACTURAS C'],
            // ['afip_code' => '012', 'description' => 'NOTAS DE DEBITO C'],
            // ['afip_code' => '013', 'description' => 'NOTAS DE CREDITO C'],
            // ['afip_code' => '015', 'description' => 'RECIBOS C'],
            ['afip_code' => '016', 'description' => 'Presupuesto'],
            ['afip_code' => '017', 'description' => 'Factura X']
           ,
        ];
        foreach ($data as $item) {
            ReceiptType::updateOrCreate(['afip_code' => $item['afip_code']], $item);
        }
    }
}
