<?php

use App\Models\SaleHeader;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Buscar venta con receipt_number terminando en 14 (el screenshot dice 014 pero el link QR dice 16??)
// El user link QR tiene nroCmp: 16. El screenshot tiene 014.
// Vamos a buscar ambas o por monto.
$sales = SaleHeader::where('total', 1500)->get();

echo "Sales with total 1500:\n";
foreach ($sales as $sale) {
    echo "ID: {$sale->id} | Receipt: {$sale->receipt_number} | CAE: " . ($sale->cae === null ? 'NULL' : "'{$sale->cae}'") . " | BranchID: {$sale->branch_id}\n";
}
