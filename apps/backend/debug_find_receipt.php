<?php

use App\Models\SaleHeader;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$sales = SaleHeader::where('receipt_number', 'LIKE', '%0014')
    ->orWhere('receipt_number', 'LIKE', '%0016')
    ->get();

echo "Sales with receipt ending in 14 or 16:\n";
foreach ($sales as $sale) {
    echo "ID: {$sale->id} | Receipt: {$sale->receipt_number} | CAE: " . ($sale->cae === null ? 'NULL' : "'{$sale->cae}'") . " | BranchID: {$sale->branch_id}\n";
}
