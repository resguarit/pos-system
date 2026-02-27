<?php
// reproduce_afip_error.php (VERIFICATION VERSION)

function simulateprepareInvoiceDataForAfip($sale)
{
    $afipIdToRate = [3 => 0.0, 4 => 10.5, 5 => 21.0, 6 => 27.0];

    // Mock data based on input
    $netAmountPreDiscount = (float) $sale['subtotal'];
    $ivaTotalPreDiscount = (float) $sale['total_iva_amount'];

    // Simulating ivaItemsPreDiscount based on user data (21% IVA)
    $ivaItemsPreDiscount = [
        ['id' => 5, 'baseAmount' => $netAmountPreDiscount, 'amount' => $ivaTotalPreDiscount]
    ];

    // Preparar tributos
    $tributos = [];
    $totalTributos = 0.0;
    if ($sale['iibb'] > 0) {
        $tributos[] = ['id' => 7, 'importe' => (float) $sale['iibb']];
        $totalTributos += (float) $sale['iibb'];
    }
    if ($sale['internal_tax'] > 0) {
        $tributos[] = ['id' => 4, 'importe' => (float) $sale['internal_tax']];
        $totalTributos += (float) $sale['internal_tax'];
    }

    // --- NEW LOGIC ---
    $taxableTotalPreDiscount = round($netAmountPreDiscount + $ivaTotalPreDiscount, 2);
    $targetTaxableTotal = round((float) $sale['total'] - $totalTributos, 2);

    $adjustmentFactor = 1.0;
    if ($taxableTotalPreDiscount > 0 && abs($taxableTotalPreDiscount - $targetTaxableTotal) > 0.01) {
        $adjustmentFactor = $targetTaxableTotal / $taxableTotalPreDiscount;
    }

    $netAmount = 0.0;
    $ivaItems = [];
    $ivaTotal = 0.0;

    foreach ($ivaItemsPreDiscount as $item) {
        $adjustedBase = round($item['baseAmount'] * $adjustmentFactor, 2);
        $rate = $afipIdToRate[$item['id']] ?? 21.0;
        $adjustedAmount = round($adjustedBase * ($rate / 100.0), 2);

        $ivaItems[] = [
            'id' => $item['id'],
            'baseAmount' => $adjustedBase,
            'amount' => $adjustedAmount,
        ];
        $netAmount += $adjustedBase;
        $ivaTotal += $adjustedAmount;
    }

    $currentTaxableSum = round($netAmount + $ivaTotal, 2);
    if ($currentTaxableSum !== $targetTaxableTotal) {
        $diff = round($targetTaxableTotal - $currentTaxableSum, 2);
        if (!empty($ivaItems)) {
            $ivaItems[0]['baseAmount'] = round($ivaItems[0]['baseAmount'] + $diff, 2);
            $netAmount = round($netAmount + $diff, 2);
        } else {
            $netAmount = $targetTaxableTotal;
        }
    }

    return [
        'netAmount' => round($netAmount, 2),
        'ivaTotal' => round($ivaTotal, 2),
        'ivaItems' => $ivaItems,
        'tributesTotal' => round($totalTributos, 2),
        'total' => round($netAmount + $ivaTotal + $totalTributos, 2)
    ];
}

// User's specific sale data
$sale = [
    'subtotal' => 15537.20,
    'total_iva_amount' => 3262.81,
    'total' => 15040.00,
    'iibb' => 0.0,
    'internal_tax' => 0.0
];

$payload = simulateprepareInvoiceDataForAfip($sale);

echo "TEST CASE: User Data (20% discount)\n";
echo "Target Total: {$sale['total']}\n";
echo "Payload Net: {$payload['netAmount']}\n";
echo "Payload IVA: {$payload['ivaTotal']}\n";
echo "Payload Tributes: {$payload['tributesTotal']}\n";
echo "Payload Total (reported): {$payload['total']}\n";
$sum = round($payload['netAmount'] + $payload['ivaTotal'] + $payload['tributesTotal'], 2);
echo "Sum of components: $sum\n";

if ($sum === (float) $sale['total']) {
    echo "SUCCESS: Components match total!\n";
} else {
    echo "FAILURE: Components do not match total!\n";
}

// Test case with IIBB
echo "\nTEST CASE: With IIBB\n";
$saleWithIibb = $sale;
$saleWithIibb['iibb'] = 100.0;
$saleWithIibb['total'] += 100.0;
$payloadIibb = simulateprepareInvoiceDataForAfip($saleWithIibb);
echo "Target Total: {$saleWithIibb['total']}\n";
$sumIibb = round($payloadIibb['netAmount'] + $payloadIibb['ivaTotal'] + $payloadIibb['tributesTotal'], 2);
echo "Sum of components: $sumIibb\n";
if ($sumIibb === (float) $saleWithIibb['total']) {
    echo "SUCCESS: Components match total with IIBB!\n";
}
