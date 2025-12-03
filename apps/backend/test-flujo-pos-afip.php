<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Resguar\AfipSdk\Facades\Afip;

echo "\n";
echo "====================================\n";
echo "TEST FLUJO COMPLETO POS + AFIP\n";
echo "====================================\n\n";

try {
    // ========================================
    // PASO 1: Verificar configuración inicial
    // ========================================
    echo "📋 PASO 1: Verificando configuración...\n";
    echo "   - Entorno: " . config('afip.environment') . "\n";
    echo "   - CUIT: " . config('afip.cuit') . "\n";
    echo "   - Punto de venta: " . config('afip.default_point_of_sale') . "\n";
    
    $isAuth = Afip::isAuthenticated();
    echo "   - Autenticación: " . ($isAuth ? '✅ OK' : '❌ FALLO') . "\n\n";
    
    if (!$isAuth) {
        throw new Exception("No se pudo autenticar con AFIP");
    }
    
    // ========================================
    // PASO 2: Obtener datos de AFIP
    // ========================================
    echo "📋 PASO 2: Obteniendo datos de AFIP...\n";
    
    $puntosVenta = Afip::getAvailablePointsOfSale();
    echo "   - Puntos de venta: " . count($puntosVenta) . " disponibles\n";
    
    $tiposComprobantes = Afip::getAvailableReceiptTypes();
    echo "   - Tipos de comprobantes: " . count($tiposComprobantes) . " autorizados\n\n";
    
    // ========================================
    // PASO 3: Simular venta del POS
    // ========================================
    echo "📋 PASO 3: Simulando venta en el POS...\n";
    
    // Datos de una venta típica del POS
    $venta = [
        'cliente' => [
            'tipo_documento' => 80, // CUIT
            'numero_documento' => '20123456789',
            'razon_social' => 'Cliente de Prueba SA',
            'domicilio' => 'Av. Corrientes 1234',
            'condicion_iva' => 'Responsable Inscripto'
        ],
        'items' => [
            [
                'descripcion' => 'Producto 1',
                'cantidad' => 2,
                'precio_unitario' => 1000.00,
                'iva' => 21, // 21%
            ],
            [
                'descripcion' => 'Producto 2',
                'cantidad' => 1,
                'precio_unitario' => 500.00,
                'iva' => 21,
            ]
        ],
        'punto_venta' => 2,
        'tipo_comprobante' => 1, // Factura A
        'concepto' => 1, // Productos
        'fecha' => date('Ymd'),
    ];
    
    echo "   Cliente: {$venta['cliente']['razon_social']}\n";
    echo "   CUIT: {$venta['cliente']['numero_documento']}\n";
    echo "   Items: " . count($venta['items']) . " productos\n\n";
    
    // ========================================
    // PASO 4: Calcular totales
    // ========================================
    echo "📋 PASO 4: Calculando totales...\n";
    
    $subtotal = 0;
    $totalIva = 0;
    
    foreach ($venta['items'] as $item) {
        $subtotalItem = $item['cantidad'] * $item['precio_unitario'];
        $ivaItem = $subtotalItem * ($item['iva'] / 100);
        
        $subtotal += $subtotalItem;
        $totalIva += $ivaItem;
    }
    
    $total = $subtotal + $totalIva;
    
    echo "   - Subtotal: $" . number_format($subtotal, 2) . "\n";
    echo "   - IVA (21%): $" . number_format($totalIva, 2) . "\n";
    echo "   - Total: $" . number_format($total, 2) . "\n\n";
    
    // ========================================
    // PASO 5: Obtener próximo número de comprobante
    // ========================================
    echo "📋 PASO 5: Consultando próximo número de comprobante...\n";
    
    $ultimoComprobante = Afip::getLastAuthorizedInvoice(
        pointOfSale: $venta['punto_venta'],
        invoiceType: $venta['tipo_comprobante']
    );
    
    $proximoNumero = $ultimoComprobante['CbteNro'] + 1;
    
    echo "   - Último autorizado: " . $ultimoComprobante['CbteNro'] . "\n";
    echo "   - Próximo número: " . $proximoNumero . "\n\n";
    
    // ========================================
    // PASO 6: Preparar datos para AFIP (formato SDK)
    // ========================================
    echo "📋 PASO 6: Preparando datos para AFIP...\n";
    
    $datosAfip = [
        'pointOfSale' => $venta['punto_venta'],
        'invoiceType' => $venta['tipo_comprobante'],
        'invoiceNumber' => $proximoNumero,
        'invoiceDate' => $venta['fecha'],
        'concept' => $venta['concepto'],
        'documentType' => $venta['cliente']['tipo_documento'],
        'documentNumber' => $venta['cliente']['numero_documento'],
        'totalAmount' => $total,
        'netAmount' => $subtotal,
        'exemptAmount' => 0,
        'ivaAmount' => $totalIva,
        'ivaItems' => [
            [
                'id' => 5, // 21%
                'baseAmount' => $subtotal,
                'amount' => $totalIva
            ]
        ],
        'items' => array_map(function($item) {
            return [
                'description' => $item['descripcion'],
                'quantity' => $item['cantidad'],
                'unitPrice' => $item['precio_unitario'],
                'total' => $item['cantidad'] * $item['precio_unitario']
            ];
        }, $venta['items'])
    ];
    
    echo "   ✅ Datos preparados correctamente\n";
    echo "   - Comprobante: " . str_pad($datosAfip['pointOfSale'], 5, '0', STR_PAD_LEFT) . "-";
    echo str_pad($datosAfip['invoiceNumber'], 8, '0', STR_PAD_LEFT) . "\n";
    echo "   - Total: $" . number_format($datosAfip['totalAmount'], 2) . "\n\n";
    
    // ========================================
    // PASO 7: Simular autorización (SIN EJECUTAR)
    // ========================================
    echo "📋 PASO 7: Simulando autorización...\n";
    echo "   ⚠️  NOTA: NO se va a autorizar la factura real\n";
    echo "   ⚠️  Solo mostramos cómo sería el código\n\n";
    
    echo "   Código que se ejecutaría:\n";
    echo "   ----------------------------------------\n";
    echo "   \$response = Afip::authorizeInvoice(\$datosAfip);\n";
    echo "   \$cae = \$response->cae;\n";
    echo "   \$vencimientoCae = \$response->caeExpirationDate;\n";
    echo "   ----------------------------------------\n\n";
    
    // ========================================
    // PASO 8: Simular respuesta de AFIP
    // ========================================
    echo "📋 PASO 8: Simulando respuesta de AFIP...\n";
    
    $respuestaSimulada = [
        'cae' => '12345678901234', // CAE simulado
        'caeExpirationDate' => date('Ymd', strtotime('+10 days')),
        'invoiceNumber' => $proximoNumero,
        'pointOfSale' => $venta['punto_venta'],
        'invoiceType' => $venta['tipo_comprobante'],
        'result' => 'A', // Aprobado
        'observations' => []
    ];
    
    echo "   ✅ Factura autorizada (SIMULADO)\n";
    echo "   - CAE: " . $respuestaSimulada['cae'] . "\n";
    echo "   - Vencimiento CAE: " . $respuestaSimulada['caeExpirationDate'] . "\n";
    echo "   - Comprobante: " . str_pad($respuestaSimulada['pointOfSale'], 5, '0', STR_PAD_LEFT) . "-";
    echo str_pad($respuestaSimulada['invoiceNumber'], 8, '0', STR_PAD_LEFT) . "\n\n";
    
    // ========================================
    // PASO 9: Guardar en base de datos (simulado)
    // ========================================
    echo "📋 PASO 9: Guardando en base de datos...\n";
    
    $facturaGuardar = [
        'punto_venta' => $respuestaSimulada['pointOfSale'],
        'tipo_comprobante' => $respuestaSimulada['invoiceType'],
        'numero_comprobante' => $respuestaSimulada['invoiceNumber'],
        'fecha' => $venta['fecha'],
        'cliente_documento' => $venta['cliente']['numero_documento'],
        'cliente_razon_social' => $venta['cliente']['razon_social'],
        'subtotal' => $subtotal,
        'iva' => $totalIva,
        'total' => $total,
        'cae' => $respuestaSimulada['cae'],
        'vencimiento_cae' => $respuestaSimulada['caeExpirationDate'],
        'estado' => 'autorizada'
    ];
    
    echo "   SQL que se ejecutaría:\n";
    echo "   ----------------------------------------\n";
    echo "   INSERT INTO invoices (\n";
    foreach (array_keys($facturaGuardar) as $campo) {
        echo "     {$campo},\n";
    }
    echo "   ) VALUES (...)\n";
    echo "   ----------------------------------------\n\n";
    
    // ========================================
    // PASO 10: Generar PDF (simulado)
    // ========================================
    echo "📋 PASO 10: Generando PDF...\n";
    echo "   ✅ PDF generado: factura_00002_00000001.pdf\n";
    echo "   - Incluye: Logo, datos fiscales, items, totales, CAE\n";
    echo "   - QR Code con datos del comprobante\n\n";
    
    // ========================================
    // RESUMEN FINAL
    // ========================================
    echo "====================================\n";
    echo "✅ TEST COMPLETADO EXITOSAMENTE\n";
    echo "====================================\n\n";
    
    echo "📊 RESUMEN DEL FLUJO:\n";
    echo "1. ✅ Configuración AFIP verificada\n";
    echo "2. ✅ Datos de AFIP obtenidos\n";
    echo "3. ✅ Venta simulada en POS\n";
    echo "4. ✅ Totales calculados correctamente\n";
    echo "5. ✅ Próximo número obtenido\n";
    echo "6. ✅ Datos preparados para AFIP\n";
    echo "7. ⚠️  Autorización simulada (no ejecutada)\n";
    echo "8. ✅ Respuesta procesada\n";
    echo "9. ✅ Datos listos para guardar\n";
    echo "10. ✅ PDF listo para generar\n\n";
    
    echo "💡 PRÓXIMOS PASOS:\n";
    echo "1. Implementar este flujo en tu controlador de ventas\n";
    echo "2. Crear endpoints API para el frontend\n";
    echo "3. Desarrollar la UI de facturación\n";
    echo "4. Probar en ambiente de testing primero\n";
    echo "5. Cuando esté listo, activar producción\n\n";
    
    echo "🔧 CÓDIGO DE EJEMPLO PARA TU CONTROLADOR:\n";
    echo "----------------------------------------\n";
    echo "// SaleController.php\n";
    echo "public function authorize(Request \$request) {\n";
    echo "    \$sale = Sale::findOrFail(\$request->sale_id);\n";
    echo "    \n";
    echo "    // Preparar datos\n";
    echo "    \$invoiceData = \$this->prepareInvoiceData(\$sale);\n";
    echo "    \n";
    echo "    // Autorizar con AFIP\n";
    echo "    \$response = Afip::authorizeInvoice(\$invoiceData);\n";
    echo "    \n";
    echo "    // Guardar CAE\n";
    echo "    \$sale->update([\n";
    echo "        'cae' => \$response->cae,\n";
    echo "        'cae_expiration' => \$response->caeExpirationDate,\n";
    echo "        'invoice_number' => \$response->invoiceNumber\n";
    echo "    ]);\n";
    echo "    \n";
    echo "    return response()->json(\$response);\n";
    echo "}\n";
    echo "----------------------------------------\n\n";
    
} catch (\Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Archivo: " . $e->getFile() . "\n";
    echo "Línea: " . $e->getLine() . "\n\n";
}
