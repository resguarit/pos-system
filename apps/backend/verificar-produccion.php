<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "\n====================================\n";
echo "VERIFICACIÓN DE CONFIGURACIÓN AFIP\n";
echo "====================================\n\n";

// 1. Verificar entorno
$environment = config('afip.environment');
echo "1. Entorno: " . ($environment === 'production' ? '✅ PRODUCCIÓN' : '⚠️ TESTING') . " ({$environment})\n";

// 2. Verificar CUIT
$cuit = config('afip.cuit');
echo "2. CUIT: {$cuit}\n";

// 3. Verificar rutas de certificados
$certPath = config('afip.certificates.path');
$keyFile = config('afip.certificates.key');
$crtFile = config('afip.certificates.crt');

echo "3. Ruta certificados: {$certPath}\n";
echo "4. Archivo clave: {$keyFile}\n";
echo "5. Archivo certificado: {$crtFile}\n\n";

// 4. Verificar que los archivos existen
$keyPath = base_path($certPath . '/' . $keyFile);
$crtPath = base_path($certPath . '/' . $crtFile);

echo "6. ¿Existe clave privada? " . (file_exists($keyPath) ? '✅ SÍ' : '❌ NO') . "\n";
echo "7. ¿Existe certificado? " . (file_exists($crtPath) ? '✅ SÍ' : '❌ NO') . "\n\n";

// 5. Verificar punto de venta
$pos = config('afip.default_point_of_sale');
echo "8. Punto de venta por defecto: {$pos}\n\n";

echo "====================================\n";
echo "VERIFICACIÓN DE AUTENTICACIÓN\n";
echo "====================================\n\n";

use Resguar\AfipSdk\Facades\Afip;

try {
    echo "Intentando autenticar con AFIP...\n";
    
    // Intentar autenticar
    $isAuth = Afip::isAuthenticated();
    
    if ($isAuth) {
        echo "✅ Autenticación EXITOSA\n\n";
        
        // Consultar último comprobante
        echo "Consultando último comprobante autorizado...\n";
        $lastInvoice = Afip::getLastAuthorizedInvoice(
            pointOfSale: (int)$pos,
            invoiceType: 1 // Factura A
        );
        
        echo "✅ Último comprobante autorizado:\n";
        echo "   - Punto de venta: " . $lastInvoice['PtoVta'] . "\n";
        echo "   - Tipo: " . $lastInvoice['CbteTipo'] . "\n";
        echo "   - Número: " . $lastInvoice['CbteNro'] . "\n";
        echo "   - Fecha: " . $lastInvoice['CbteFch'] . "\n";
        
    } else {
        echo "⚠️ No autenticado\n";
    }
    
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    if (method_exists($e, 'getAfipCode') && $e->getAfipCode()) {
        echo "   Código AFIP: " . $e->getAfipCode() . "\n";
    }
}

echo "\n====================================\n";
echo "⚠️  IMPORTANTE\n";
echo "====================================\n";
echo "Si estás en PRODUCCIÓN:\n";
echo "- Las facturas que autorices serán REALES\n";
echo "- Tendrán validez fiscal oficial\n";
echo "- Quedarán registradas en AFIP\n";
echo "====================================\n\n";
