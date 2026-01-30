<?php

use App\Models\SaleHeader;
use App\Services\SaleService;
use App\Constants\AfipConstants;
use Illuminate\Support\Facades\Log;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Mockear venta
$sale = new SaleHeader([
    'receipt_number' => '00000013',
    'id' => 999,
    'total' => 1500.00,
    'date' => now(),
]);
$sale->cae = '12345678901234';
$sale->cae_expiration_date = now()->addDays(10);
// Mockear relaciones
$sale->setRelation('branch', new \App\Models\Branch(['id' => 1, 'point_of_sale' => 2, 'cuit' => '30718708997']));
$sale->setRelation('receiptType', new \App\Models\ReceiptType(['id' => 6, 'afip_code' => '006'])); // Factura B
$sale->setRelation('customer', new \App\Models\Customer(['id' => 1]));
$sale->customer->setRelation('person', new \App\Models\Person(['cuit' => '20457809027', 'first_name' => 'Test', 'last_name' => 'User']));

echo "Mocked Sale: ID {$sale->id} | Receipt: {$sale->receipt_number} | CAE: " . ($sale->cae ?? 'NULL') . "\n";

// Instanciar servicio (usando reflection para acceder a métodos privados si es necesario, 
// o simplemente copiando la lógica si es pública, pero better use reflection)

$service = app(SaleService::class);
$reflection = new ReflectionClass($service);

// 1. Check buildInvoiceDataForSdk
$methodInvoice = $reflection->getMethod('buildInvoiceDataForSdk');
$methodInvoice->setAccessible(true);
$invoiceData = $methodInvoice->invoke($service, $sale);

echo "\n--- Invoice Data (for SDK) ---\n";
echo "codAut: " . ($invoiceData['codAut'] ?? 'MISSING') . "\n";
echo "customerDocumentNumber: " . ($invoiceData['customerDocumentNumber'] ?? 'MISSING') . "\n";

// 2. Check buildAfipResponseFromSale
$methodResponse = $reflection->getMethod('buildAfipResponseFromSale');
$methodResponse->setAccessible(true);
$responseData = $methodResponse->invoke($service, $sale);

echo "\n--- Response Data (raw) ---\n";
echo "cae: " . ($responseData['cae'] ?? 'MISSING') . "\n";
echo "codAut: " . ($responseData['codAut'] ?? 'MISSING') . "\n";

// 3. Check normalizeArrayForInvoiceResponse
$methodNormalize = $reflection->getMethod('normalizeArrayForInvoiceResponse');
$methodNormalize->setAccessible(true);
$normalized = $methodNormalize->invoke($service, $responseData);

echo "\n--- Normalized Response ---\n";
echo "cae: " . ($normalized['cae'] ?? 'MISSING') . "\n";
echo "codAut: " . ($normalized['codAut'] ?? 'MISSING') . "\n";
