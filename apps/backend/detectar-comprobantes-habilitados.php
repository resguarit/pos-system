<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Resguar\AfipSdk\Facades\Afip;

echo "\n";
echo "====================================\n";
echo "DETECTAR COMPROBANTES HABILITADOS\n";
echo "====================================\n\n";

echo "⚠️  IMPORTANTE: Este script detecta qué comprobantes\n";
echo "    podés emitir consultando el último número de cada tipo.\n";
echo "    Si AFIP devuelve un número (aunque sea 0), el tipo está habilitado.\n\n";

try {
    // Obtener todos los tipos de AFIP
    $todosLosTipos = Afip::getAvailableReceiptTypes();
    $puntosVenta = Afip::getAvailablePointsOfSale();
    $puntoVenta = $puntosVenta[0]['number'];
    
    echo "📋 Probando " . count($todosLosTipos) . " tipos de comprobantes...\n";
    echo "   Punto de venta: {$puntoVenta}\n\n";
    
    $tiposHabilitados = [];
    $tiposNoHabilitados = [];
    
    foreach ($todosLosTipos as $tipo) {
        $tipoId = $tipo['id'];
        $tipoDesc = $tipo['description'];
        
        try {
            // Intentar consultar el último comprobante
            $ultimo = Afip::getLastAuthorizedInvoice(
                pointOfSale: (int)$puntoVenta,
                invoiceType: $tipoId
            );
            
            // Si llegamos aquí, el tipo está habilitado
            $tiposHabilitados[] = [
                'id' => $tipoId,
                'description' => $tipoDesc,
                'last_number' => $ultimo['CbteNro']
            ];
            
            echo "✅ Tipo {$tipoId}: {$tipoDesc}\n";
            
        } catch (\Exception $e) {
            // Si falla, el tipo NO está habilitado para este CUIT
            $mensaje = $e->getMessage();
            
            // Verificar si es un error de "no habilitado" o un error de conexión
            if (strpos($mensaje, 'no se encuentra habilitado') !== false ||
                strpos($mensaje, 'not authorized') !== false ||
                strpos($mensaje, '11002') !== false) {
                
                $tiposNoHabilitados[] = [
                    'id' => $tipoId,
                    'description' => $tipoDesc,
                    'error' => 'No habilitado'
                ];
                
                echo "❌ Tipo {$tipoId}: {$tipoDesc} (No habilitado)\n";
            } else {
                // Error de conexión u otro
                echo "⚠️  Tipo {$tipoId}: {$tipoDesc} (Error: " . substr($mensaje, 0, 50) . "...)\n";
            }
        }
        
        // Pequeña pausa para no saturar AFIP
        usleep(100000); // 0.1 segundos
    }
    
    echo "\n";
    echo "====================================\n";
    echo "RESUMEN\n";
    echo "====================================\n\n";
    
    echo "✅ Tipos HABILITADOS: " . count($tiposHabilitados) . "\n";
    foreach ($tiposHabilitados as $tipo) {
        echo "   - Tipo " . str_pad($tipo['id'], 3) . ": " . $tipo['description'] . "\n";
    }
    
    echo "\n❌ Tipos NO HABILITADOS: " . count($tiposNoHabilitados) . "\n";
    if (count($tiposNoHabilitados) > 0) {
        echo "   (Primeros 10)\n";
        foreach (array_slice($tiposNoHabilitados, 0, 10) as $tipo) {
            echo "   - Tipo " . str_pad($tipo['id'], 3) . ": " . $tipo['description'] . "\n";
        }
    }
    
    echo "\n";
    echo "====================================\n";
    echo "CÓDIGO PARA GUARDAR EN BD\n";
    echo "====================================\n\n";
    
    echo "// Guardar en configuración o BD\n";
    echo "\$tiposHabilitados = " . var_export(array_column($tiposHabilitados, 'id'), true) . ";\n\n";
    
    echo "// O en formato JSON para el frontend\n";
    echo json_encode($tiposHabilitados, JSON_PRETTY_PRINT) . "\n\n";
    
    echo "💡 RECOMENDACIÓN:\n";
    echo "   Ejecutá este script UNA VEZ al configurar cada sucursal\n";
    echo "   y guardá los resultados en la base de datos.\n\n";
    
} catch (\Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n\n";
}
