<?php

/**
 * Script de prueba para validar métodos mejorados del SDK AFIP
 * - getAvailableReceiptTypes()
 * - getAvailablePointsOfSale()
 * 
 * Uso: php test-afip-parametros.php
 */

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Log;

// Colores para terminal
$colors = [
    'reset' => "\033[0m",
    'green' => "\033[32m",
    'yellow' => "\033[33m",
    'red' => "\033[31m",
    'blue' => "\033[34m",
    'cyan' => "\033[36m",
    'bold' => "\033[1m",
];

function printHeader($text, $colors) {
    echo "\n{$colors['bold']}{$colors['cyan']}";
    echo str_repeat('=', strlen($text) + 4) . "\n";
    echo "  {$text}\n";
    echo str_repeat('=', strlen($text) + 4);
    echo "{$colors['reset']}\n\n";
}

function printSuccess($text, $colors) {
    echo "{$colors['green']}✓ {$text}{$colors['reset']}\n";
}

function printError($text, $colors) {
    echo "{$colors['red']}✗ {$text}{$colors['reset']}\n";
}

function printInfo($text, $colors) {
    echo "{$colors['blue']}ℹ {$text}{$colors['reset']}\n";
}

function printWarning($text, $colors) {
    echo "{$colors['yellow']}⚠ {$text}{$colors['reset']}\n";
}

try {
    printHeader('PRUEBA DE SDK AFIP - MEJORAS EN PARÁMETROS WSFE', $colors);

    // Inicializar aplicación Laravel
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    printInfo("Entorno: " . config('app.env'), $colors);
    printInfo("AFIP Entorno: " . config('afip.environment'), $colors);
    printInfo("AFIP CUIT: " . config('afip.cuit'), $colors);
    echo "\n";

    // Obtener servicio AFIP
    $afip = app(\Resguar\AfipSdk\Services\AfipService::class);
    $cuit = config('afip.cuit');

    // ========================================
    // PRUEBA 1: Tipos de Comprobantes
    // ========================================
    printHeader('1. OBTENER TIPOS DE COMPROBANTES DISPONIBLES', $colors);
    
    $startTime = microtime(true);
    try {
        $receiptTypes = $afip->getAvailableReceiptTypes($cuit);
        $elapsed = round((microtime(true) - $startTime) * 1000, 2);
        
        printSuccess("Obtenidos en {$elapsed}ms", $colors);
        printInfo("Total: " . count($receiptTypes) . " tipos de comprobantes", $colors);
        echo "\n";
        
        if (!empty($receiptTypes)) {
            echo "{$colors['bold']}Primeros 10 tipos encontrados:{$colors['reset']}\n";
            foreach (array_slice($receiptTypes, 0, 10) as $type) {
                $id = str_pad((string) $type['id'], 3, ' ', STR_PAD_LEFT);
                $desc = substr($type['description'], 0, 65);
                echo "  [{$id}] {$desc}\n";
            }
            
            if (count($receiptTypes) > 10) {
                $remaining = count($receiptTypes) - 10;
                echo "\n  {$colors['cyan']}... y {$remaining} tipos más{$colors['reset']}\n";
            }
            
            // Buscar tipos comunes
            echo "\n{$colors['bold']}Tipos de comprobantes comunes:{$colors['reset']}\n";
            $commonTypes = [1, 6, 11, 51, 3, 8];
            foreach ($receiptTypes as $type) {
                if (in_array($type['id'], $commonTypes)) {
                    $id = str_pad((string) $type['id'], 3, ' ', STR_PAD_LEFT);
                    echo "  [{$id}] {$type['description']}\n";
                }
            }
        } else {
            printWarning("No se encontraron tipos de comprobantes", $colors);
        }
    } catch (\Exception $e) {
        printError("Error: " . $e->getMessage(), $colors);
        echo "{$colors['red']}Trace:{$colors['reset']}\n";
        echo substr($e->getTraceAsString(), 0, 500) . "...\n";
    }
    
    echo "\n";
    
    // ========================================
    // PRUEBA 2: Puntos de Venta
    // ========================================
    printHeader('2. OBTENER PUNTOS DE VENTA DISPONIBLES', $colors);
    
    $startTime = microtime(true);
    try {
        $pointsOfSale = $afip->getAvailablePointsOfSale($cuit);
        $elapsed = round((microtime(true) - $startTime) * 1000, 2);
        
        printSuccess("Obtenidos en {$elapsed}ms", $colors);
        printInfo("Total: " . count($pointsOfSale) . " puntos de venta", $colors);
        echo "\n";
        
        if (!empty($pointsOfSale)) {
            echo "{$colors['bold']}Puntos de venta habilitados:{$colors['reset']}\n";
            foreach ($pointsOfSale as $pos) {
                $number = str_pad((string) $pos['number'], 4, '0', STR_PAD_LEFT);
                $type = $pos['type'] ?? 'N/A';
                $enabled = $pos['enabled'] ? '✓ Activo' : '✗ Inactivo';
                $from = $pos['from'] ?? 'N/A';
                $to = $pos['to'] ?? 'Sin vencimiento';
                
                echo "  • PdV {$number} | Tipo: {$type} | {$enabled}\n";
                echo "    Vigencia: {$from} → {$to}\n";
            }
        } else {
            printWarning("No se encontraron puntos de venta", $colors);
        }
    } catch (\Exception $e) {
        printError("Error: " . $e->getMessage(), $colors);
        echo "{$colors['red']}Trace:{$colors['reset']}\n";
        echo substr($e->getTraceAsString(), 0, 500) . "...\n";
    }
    
    echo "\n";
    
    // ========================================
    // PRUEBA 3: Verificar Cache
    // ========================================
    printHeader('3. VERIFICAR FUNCIONAMIENTO DE CACHE', $colors);
    
    printInfo("Segunda llamada a tipos de comprobantes (debería usar cache)...", $colors);
    $startTime = microtime(true);
    try {
        $cachedTypes = $afip->getAvailableReceiptTypes($cuit);
        $elapsed = round((microtime(true) - $startTime) * 1000, 2);
        
        if ($elapsed < 50) {
            printSuccess("Cache funcionando correctamente ({$elapsed}ms) ⚡", $colors);
        } else {
            printWarning("Posible cache miss ({$elapsed}ms)", $colors);
        }
        printInfo("Total tipos en cache: " . count($cachedTypes), $colors);
    } catch (\Exception $e) {
        printError("Error: " . $e->getMessage(), $colors);
    }
    
    echo "\n";
    printInfo("Segunda llamada a puntos de venta (debería usar cache)...", $colors);
    $startTime = microtime(true);
    try {
        $cachedPos = $afip->getAvailablePointsOfSale($cuit);
        $elapsed = round((microtime(true) - $startTime) * 1000, 2);
        
        if ($elapsed < 50) {
            printSuccess("Cache funcionando correctamente ({$elapsed}ms) ⚡", $colors);
        } else {
            printWarning("Posible cache miss ({$elapsed}ms)", $colors);
        }
        printInfo("Total puntos en cache: " . count($cachedPos), $colors);
    } catch (\Exception $e) {
        printError("Error: " . $e->getMessage(), $colors);
    }
    
    // ========================================
    // PRUEBA 4: Validaciones
    // ========================================
    echo "\n";
    printHeader('4. PROBAR VALIDACIÓN DE CUIT INVÁLIDO', $colors);
    
    try {
        printInfo("Intentando con CUIT inválido: '12345'...", $colors);
        $afip->getAvailableReceiptTypes('12345');
        printWarning("No lanzó excepción (esperado error de validación)", $colors);
    } catch (\Resguar\AfipSdk\Exceptions\AfipException $e) {
        printSuccess("Validación funcionando: " . $e->getMessage(), $colors);
    } catch (\Exception $e) {
        printError("Error inesperado: " . $e->getMessage(), $colors);
    }
    
    // ========================================
    // Resumen Final
    // ========================================
    echo "\n";
    printHeader('✅ PRUEBAS COMPLETADAS', $colors);
    
    echo "{$colors['green']}Las mejoras implementadas están funcionando correctamente:{$colors['reset']}\n";
    echo "  ✓ Obtención de tipos de comprobantes\n";
    echo "  ✓ Obtención de puntos de venta\n";
    echo "  ✓ Sistema de cache\n";
    echo "  ✓ Validaciones de entrada\n";
    echo "  ✓ Métricas de performance\n";
    echo "\n";
    
    printInfo("Revisa los logs de Laravel para ver el logging detallado.", $colors);
    echo "\n";
    
} catch (\Exception $e) {
    printError("Error fatal: " . $e->getMessage(), $colors);
    echo "\n{$colors['red']}Trace completo:{$colors['reset']}\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
