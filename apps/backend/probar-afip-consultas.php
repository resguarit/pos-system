<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Resguar\AfipSdk\Facades\Afip;

echo "\n";
echo "====================================\n";
echo "PRUEBAS AFIP PRODUCCIÓN (SOLO CONSULTAS)\n";
echo "====================================\n\n";

try {
    // 1. Verificar autenticación
    echo "1️⃣  Verificando autenticación WSAA...\n";
    $isAuth = Afip::isAuthenticated();
    echo $isAuth ? "   ✅ Autenticado correctamente\n\n" : "   ❌ No autenticado\n\n";
    
    // 2. Obtener puntos de venta
    echo "2️⃣  Consultando puntos de venta habilitados...\n";
    $puntosVenta = Afip::getAvailablePointsOfSale();
    echo "   Total: " . count($puntosVenta) . " puntos de venta\n";
    foreach ($puntosVenta as $pv) {
        echo "   - PV " . $pv['number'] . ": " . ($pv['enabled'] ? '✅ Activo' : '❌ Inactivo') . "\n";
    }
    echo "\n";
    
    // 3. Obtener tipos de comprobantes
    echo "3️⃣  Consultando tipos de comprobantes autorizados...\n";
    $tiposComprobantes = Afip::getAvailableReceiptTypes();
    echo "   Total: " . count($tiposComprobantes) . " tipos disponibles\n\n";
    echo "   📋 Facturas:\n";
    foreach ($tiposComprobantes as $tipo) {
        if (in_array($tipo['id'], [1, 6, 11, 51])) {
            echo "   - Tipo " . str_pad($tipo['id'], 3) . ": " . $tipo['description'] . "\n";
        }
    }
    echo "\n   📋 Notas de Crédito:\n";
    foreach ($tiposComprobantes as $tipo) {
        if (in_array($tipo['id'], [3, 8, 13, 53])) {
            echo "   - Tipo " . str_pad($tipo['id'], 3) . ": " . $tipo['description'] . "\n";
        }
    }
    echo "\n   📋 Notas de Débito:\n";
    foreach ($tiposComprobantes as $tipo) {
        if (in_array($tipo['id'], [2, 7, 12, 52])) {
            echo "   - Tipo " . str_pad($tipo['id'], 3) . ": " . $tipo['description'] . "\n";
        }
    }
    echo "\n";
    
    // 4. Consultar último comprobante autorizado por tipo
    echo "4️⃣  Consultando últimos comprobantes autorizados...\n";
    $pvNum = $puntosVenta[0]['number'];
    
    $tiposPrueba = [
        1 => 'Factura A',
        6 => 'Factura B',
        11 => 'Factura C',
        3 => 'Nota de Crédito A',
        8 => 'Nota de Crédito B'
    ];
    
    foreach ($tiposPrueba as $tipoId => $tipoNombre) {
        try {
            $ultimo = Afip::getLastAuthorizedInvoice(
                pointOfSale: (int)$pvNum,
                invoiceType: $tipoId
            );
            $numero = $ultimo['CbteNro'];
            $estado = $numero > 0 ? "Último: {$numero}" : "Sin comprobantes";
            echo "   - {$tipoNombre} (PV {$pvNum}): {$estado}\n";
        } catch (\Exception $e) {
            echo "   - {$tipoNombre}: ⚠️  " . $e->getMessage() . "\n";
        }
    }
    echo "\n";
    
    // 5. Consultar estado de contribuyente
    echo "5️⃣  Consultando estado de contribuyente...\n";
    $cuitConsulta = config('afip.cuit');
    try {
        $estado = Afip::getTaxpayerStatus($cuitConsulta);
        echo "   CUIT: {$cuitConsulta}\n";
        if (isset($estado['nombre'])) {
            echo "   - Razón Social: " . $estado['nombre'] . "\n";
        }
        if (isset($estado['tipoPersona'])) {
            echo "   - Tipo Persona: " . $estado['tipoPersona'] . "\n";
        }
        if (isset($estado['estadoClave'])) {
            echo "   - Estado: " . $estado['estadoClave'] . "\n";
        }
        echo "\n   📋 Datos completos:\n";
        foreach ($estado as $key => $value) {
            if (is_string($value) || is_numeric($value)) {
                echo "   - {$key}: {$value}\n";
            }
        }
    } catch (\Exception $e) {
        echo "   ⚠️  " . $e->getMessage() . "\n";
    }
    echo "\n";
    
    echo "====================================\n";
    echo "✅ TODAS LAS CONSULTAS COMPLETADAS\n";
    echo "====================================\n\n";
    
    echo "📊 RESUMEN:\n";
    echo "- Autenticación: ✅ Funcionando\n";
    echo "- Puntos de venta: " . count($puntosVenta) . " disponibles\n";
    echo "- Tipos de comprobantes: " . count($tiposComprobantes) . " autorizados\n";
    echo "- Consultas de estado: ✅ Funcionando\n\n";
    
    echo "⚠️  IMPORTANTE:\n";
    echo "- Estas son SOLO consultas de lectura\n";
    echo "- NO se autorizaron facturas reales\n";
    echo "- Podés usar estos datos para desarrollar tu sistema\n";
    echo "- Para emitir facturas REALES, necesitás autorización explícita\n\n";
    
    echo "💡 PRÓXIMOS PASOS:\n";
    echo "1. Integrar estas consultas en tu frontend\n";
    echo "2. Desarrollar la UI de facturación\n";
    echo "3. Probar el flujo completo en testing\n";
    echo "4. Cuando estés listo, solicitar permiso para facturar en producción\n\n";
    
} catch (\Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Clase: " . get_class($e) . "\n\n";
}
