<?php

use App\Models\SaleHeader;
use Illuminate\Support\Facades\Log;

// Cargar Laravel
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$sales = SaleHeader::orderBy('id', 'desc')->take(5)->get();

echo "Latest Sales:\n";
foreach ($sales as $sale) {
    echo "ID: {$sale->id} | Receipt: {$sale->receipt_number} | CAE: " . ($sale->cae === null ? 'NULL' : "'{$sale->cae}'") . " | Status: {$sale->status}\n";
}
