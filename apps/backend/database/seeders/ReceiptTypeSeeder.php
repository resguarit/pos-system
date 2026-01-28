<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ReceiptType;

class ReceiptTypeSeeder extends Seeder
{
    public function run(): void
    {
        // Tabla alineada con AFIP (ver docs/AFIP-TIPOS-COMPROBANTES.md)
        $data = [
            ['afip_code' => '001', 'description' => 'Factura A'],
            ['afip_code' => '002', 'description' => 'Nota de Débito A'],
            ['afip_code' => '003', 'description' => 'Nota de Crédito A'],
            ['afip_code' => '004', 'description' => 'Recibo A'],
            ['afip_code' => '006', 'description' => 'Factura B'],
            ['afip_code' => '007', 'description' => 'Nota de Débito B'],
            ['afip_code' => '008', 'description' => 'Nota de Crédito B'],
            ['afip_code' => '009', 'description' => 'Recibo B'],
            ['afip_code' => '011', 'description' => 'Factura C'],
            ['afip_code' => '012', 'description' => 'Nota de Débito C'],
            ['afip_code' => '013', 'description' => 'Nota de Crédito C'],
            ['afip_code' => '015', 'description' => 'Recibo C'],
            ['afip_code' => '051', 'description' => 'Factura M'],
            ['afip_code' => '052', 'description' => 'Nota de Débito M'],
            ['afip_code' => '053', 'description' => 'Nota de Crédito M'],
            ['afip_code' => '054', 'description' => 'Recibo M'],
            // Uso interno POS (no AFIP)
            ['afip_code' => '016', 'description' => 'Presupuesto'],
            ['afip_code' => '017', 'description' => 'Factura X'],
            ['afip_code' => '201', 'description' => 'Factura de Crédito electrónica MiPyMEs (FCE) A'],
            ['afip_code' => '202', 'description' => 'Nota de Débito electrónica MiPyMEs (FCE) A'],
            ['afip_code' => '203', 'description' => 'Nota de Crédito electrónica MiPyMEs (FCE) A'],
            ['afip_code' => '206', 'description' => 'Factura de Crédito electrónica MiPyMEs (FCE) B'],
            ['afip_code' => '207', 'description' => 'Nota de Débito electrónica MiPyMEs (FCE) B'],
            ['afip_code' => '208', 'description' => 'Nota de Crédito electrónica MiPyMEs (FCE) B'],
            ['afip_code' => '211', 'description' => 'Factura de Crédito electrónica MiPyMEs (FCE) C'],
            ['afip_code' => '212', 'description' => 'Nota de Débito electrónica MiPyMEs (FCE) C'],
            ['afip_code' => '213', 'description' => 'Nota de Crédito electrónica MiPyMEs (FCE) C'],
        ];

        $codes = array_column($data, 'afip_code');
        ReceiptType::whereNotIn('afip_code', $codes)->delete();

        foreach ($data as $item) {
            ReceiptType::updateOrCreate(['afip_code' => $item['afip_code']], $item);
        }
    }
}
