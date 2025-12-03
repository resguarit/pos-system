<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Resguar\AfipSdk\Facades\Afip;

echo "\n";
echo "====================================\n";
echo "PRUEBAS AFIP PRODUCCIÓN (SIN FACTURAR)\n";
echo "====================================\n\n";

try {
    // 1. Verificar autenticación
    echo "1️⃣  Verificando autenticación...\n";
    $isAuth = Afip::isAuthenticated();
    echo $isAuth ? "   ✅ Autenticado correctamente\n\n" : "   ❌ No autenticado\n\n";
    
    // 2. Obtener puntos de venta
    echo "2️⃣  Consultando puntos de venta habilitados...\n";
    $puntosVenta = Afip::getAvailablePointsOfSale();
    foreach ($puntosVenta as $pv) {
        echo "   - PV " . $pv['number'] . ": " . ($pv['enabled'] ? '✅ Activo' : '❌ Inactivo') . "\n";
    }
    echo "\n";
    
    // 3. Obtener tipos de comprobantes
    echo "3️⃣  Consultando tipos de comprobantes autorizados...\n";
    $tiposComprobantes = Afip::getAvailableReceiptTypes();
    echo "   Total: " . count($tiposComprobantes) . " tipos disponibles\n";
    echo "   Principales:\n";
    foreach (array_slice($tiposComprobantes, 0, 10) as $tipo) {
        echo "   - Tipo " . str_pad($tipo['id'], 3) . ": " . $tipo['description'] . "\n";
    }
    echo "\n";
    
    // 4. Consultar último comprobante autorizado
    echo "4️⃣  Consultando último comprobante autorizado...\n";
    $pvNum = $puntosVenta[0]['number'];
    
    // Probar diferentes tipos de comprobantes
    $tiposPrueba = [
        1 => 'Factura A',
        6 => 'Factura B',
        11 => 'Factura C'
    ];
    
    foreach ($tiposPrueba as $tipoId => $tipoNombre) {
        try {
            $ultimo = Afip::getLastAuthorizedInvoice(
                pointOfSale: (int)$pvNum,
                invoiceType: $tipoId
            );
            echo "   - {$tipoNombre} (PV {$pvNum}): Último Nro. " . $ultimo['CbteNro'] . "\n";
        } catch (\Exception $e) {
            echo "   - {$tipoNombre}: " . $e->getMessage() . "\n";
        }
    }
    echo "\n";
    
    // 5. Consultar tipos de documentos
    echo "5️⃣  Consultando tipos de documentos...\n";
    $tiposDoc = Afip::getDocumentTypes();
    echo "   Total: " . count($tiposDoc) . " tipos\n";
    foreach (array_slice($tiposDoc, 0, 5) as $doc) {
        echo "   - " . $doc['Id'] . ": " . $doc['Desc'] . "\n";
    }
    echo "\n";
    
    // 6. Consultar tipos de IVA
    echo "6️⃣  Consultando alícuotas de IVA...\n";
    $tiposIva = Afip::getIvaTypes();
    echo "   Total: " . count($tiposIva) . " alícuotas\n";
    foreach ($tiposIva as $iva) {
        echo "   - " . $iva['Id'] . ": " . $iva['Desc'] . "\n";
    }
    echo "\n";
    
    // 7. Consultar tipos de conceptos
    echo "7️⃣  Consultando tipos de conceptos...\n";
    $conceptos = Afip::getConceptTypes();
    foreach ($conceptos as $concepto) {
        echo "   - " . $concepto['Id'] . ": " . $concepto['Desc'] . "\n";
    }
    echo "\n";
    
    // 8. Consultar monedas
    echo "8️⃣  Consultando monedas habilitadas...\n";
    $monedas = Afip::getCurrencies();
    echo "   Total: " . count($monedas) . " monedas\n";
    foreach (array_slice($monedas, 0, 5) as $moneda) {
        echo "   - " . $moneda['Id'] . ": " . $moneda['Desc'] . "\n";
    }
    echo "\n";
    
    // 9. Consultar cotización de dólar
    echo "9️⃣  Consultando cotización del dólar...\n";
    try {
        $cotizacion = Afip::getCurrencyQuote('DOL');
        echo "   - Dólar (DOL): $" . $cotizacion['MonCotiz'] . "\n";
        echo "   - Fecha: " . $cotizacion['FchCotiz'] . "\n";
    } catch (\Exception $e) {
        echo "   ⚠️  " . $e->getMessage() . "\n";
    }
    echo "\n";
    
    // 10. Consultar estado de un contribuyente
    echo "🔟 Consultando estado de contribuyente (ejemplo)...\n";
    $cuitConsulta = config('afip.cuit');
    try {
        $estado = Afip::getTaxpayerStatus($cuitConsulta);
        echo "   CUIT: {$cuitConsulta}\n";
        echo "   - Razón Social: " . ($estado['nombre'] ?? 'N/A') . "\n";
        echo "   - Tipo Persona: " . ($estado['tipoPersona'] ?? 'N/A') . "\n";
        echo "   - Estado: " . ($estado['estadoClave'] ?? 'N/A') . "\n";
    } catch (\Exception $e) {
        echo "   ⚠️  " . $e->getMessage() . "\n";
    }
    echo "\n";
    
    echo "====================================\n";
    echo "✅ TODAS LAS PRUEBAS COMPLETADAS\n";
    echo "====================================\n\n";
    
    echo "⚠️  IMPORTANTE:\n";
    echo "- Estas son consultas de LECTURA solamente\n";
    echo "- NO se autorizaron facturas\n";
    echo "- Podés usar estos datos para desarrollar\n";
    echo "- Para facturar REAL, necesitás autorización\n\n";
    
} catch (\Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Clase: " . get_class($e) . "\n\n";
}
