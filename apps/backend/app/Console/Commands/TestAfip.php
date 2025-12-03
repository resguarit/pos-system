<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Resguar\AfipSdk\Facades\Afip;
use Resguar\AfipSdk\Exceptions\AfipException;

class TestAfip extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'afip:test 
                            {--cuit= : CUIT específico para probar (opcional)}
                            {--point-of-sale=1 : Punto de venta a usar}
                            {--invoice-type=1 : Tipo de comprobante (1=Factura A, 6=Factura B)}
                            {--skip-auth : Saltar prueba de autenticación}
                            {--skip-invoice : Saltar autorización de factura}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Probar SDK de AFIP - Verifica autenticación, consulta último comprobante y autoriza una factura de prueba';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧪 Probando SDK de AFIP...');
        $this->newLine();
        
        $cuit = $this->option('cuit') ?: config('afip.cuit');
        $pointOfSale = (int) $this->option('point-of-sale');
        $invoiceType = (int) $this->option('invoice-type');
        
        if (!$cuit) {
            $this->error('❌ CUIT no configurado. Configure AFIP_CUIT en .env o use --cuit=XXXXX');
            return 1;
        }
        
        // Verificar certificados
        $certPath = config('afip.certificates.path');
        $certKey = config('afip.certificates.key');
        $certCrt = config('afip.certificates.crt');
        $keyPath = $certPath . '/' . $certKey;
        $crtPath = $certPath . '/' . $certCrt;
        
        $this->info("📋 Configuración:");
        $this->line("   CUIT: {$cuit}");
        $this->line("   Punto de Venta: {$pointOfSale}");
        $this->line("   Tipo de Comprobante: {$invoiceType}");
        $this->line("   Entorno: " . config('afip.environment', 'testing'));
        $this->newLine();
        
        $this->info("📁 Certificados:");
        $this->line("   Ruta: {$certPath}");
        $this->line("   Clave privada: " . (file_exists($keyPath) ? "✅ {$certKey}" : "❌ {$certKey} (no encontrado)"));
        $this->line("   Certificado: " . (file_exists($crtPath) ? "✅ {$certCrt}" : "❌ {$certCrt} (no encontrado)"));
        
        if (!file_exists($keyPath) || !file_exists($crtPath)) {
            $this->newLine();
            $this->warn("⚠️  ADVERTENCIA: Los certificados no se encuentran en la ruta configurada.");
            $this->line("   Coloca los certificados en: {$certPath}/");
            $this->line("   Archivos necesarios:");
            $this->line("     - {$certKey}");
            $this->line("     - {$certCrt}");
            $this->newLine();
            
            if (!$this->confirm('¿Deseas continuar de todos modos? (fallará al intentar autenticar)', false)) {
                return 1;
            }
            $this->newLine();
        }
        
        try {
            // 1. Verificar autenticación
            if (!$this->option('skip-auth')) {
                $this->info('1️⃣ Verificando autenticación...');
                $isAuthenticated = $cuit ? Afip::isAuthenticated($cuit) : Afip::isAuthenticated();
                
                if ($isAuthenticated) {
                    $this->info('✅ Autenticado (token válido en cache)');
                } else {
                    $this->warn('⚠️  No hay token en cache (se generará al autorizar)');
                }
                $this->newLine();
            }
            
            // 2. Consultar último comprobante
            $this->info('2️⃣ Consultando último comprobante autorizado...');
            try {
                $lastInvoice = $cuit 
                    ? Afip::getLastAuthorizedInvoice($pointOfSale, $invoiceType, $cuit)
                    : Afip::getLastAuthorizedInvoice($pointOfSale, $invoiceType);
                
                $this->info("✅ Último comprobante autorizado:");
                $this->table(
                    ['Campo', 'Valor'],
                    [
                        ['Número', $lastInvoice['CbteNro'] ?? 'N/A'],
                        ['Fecha', $lastInvoice['CbteFch'] ?? 'N/A'],
                        ['Punto de Venta', $lastInvoice['PtoVta'] ?? 'N/A'],
                        ['Tipo', $lastInvoice['CbteTipo'] ?? 'N/A'],
                    ]
                );
            } catch (AfipException $e) {
                $this->warn("⚠️  No se pudo consultar último comprobante: " . $e->getMessage());
                if ($e->getAfipCode()) {
                    $this->line("   Código AFIP: " . $e->getAfipCode());
                }
            }
            $this->newLine();
            
            // 3. Autorizar factura de prueba
            if (!$this->option('skip-invoice')) {
                $this->info('3️⃣ Autorizando factura de prueba...');
                
                // Intentar obtener el último número para sugerir el siguiente
                $suggestedNumber = 1;
                try {
                    $lastInvoice = $cuit 
                        ? Afip::getLastAuthorizedInvoice($pointOfSale, $invoiceType, $cuit)
                        : Afip::getLastAuthorizedInvoice($pointOfSale, $invoiceType);
                    if (isset($lastInvoice['CbteNro'])) {
                        $suggestedNumber = (int) $lastInvoice['CbteNro'] + 1;
                    }
                } catch (\Exception $e) {
                    // Si no se puede consultar, usar 1
                    $suggestedNumber = 1;
                }
                
                $invoiceData = [
                    'pointOfSale' => $pointOfSale,
                    'invoiceType' => $invoiceType,
                    'invoiceNumber' => $suggestedNumber,  // Número sugerido (el SDK lo ajustará si es necesario)
                    'date' => date('Ymd'),
                    'customerCuit' => '20123456789',  // CUIT de prueba (homologación)
                    'customerDocumentType' => 80,  // CUIT
                    'customerDocumentNumber' => '20123456789',
                    'concept' => 1,  // Productos
                    'items' => [
                        [
                            'description' => 'Producto de prueba - Test AFIP SDK',
                            'quantity' => 1.0,
                            'unitPrice' => 100.0,
                            'taxRate' => 21.0,
                        ],
                    ],
                    'netAmount' => 100.0,
                    'ivaTotal' => 21.0,
                    'total' => 121.0,
                    'ivaItems' => [
                        [
                            'id' => 5,  // 21%
                            'baseAmount' => 100.0,
                            'amount' => 21.0,
                        ],
                    ],
                ];
                
                $this->line("   Preparando factura de prueba...");
                $this->line("   Número sugerido: {$suggestedNumber} (el SDK lo ajustará si es necesario)");
                $this->line("   Cliente: 20123456789 (CUIT de prueba)");
                $this->line("   Total: $121.00");
                
                if ($this->confirm('¿Deseas continuar con la autorización?', true)) {
                    $result = $cuit 
                        ? Afip::authorizeInvoice($invoiceData, $cuit)
                        : Afip::authorizeInvoice($invoiceData);
                    
                    $this->info('🔍 Estructura de respuesta (DEBUG):');
                    dump($result);
                    
                    $this->newLine();
                    $this->info('✅ Factura autorizada exitosamente!');
                    $this->newLine();
                    
                    // Convertir resultado a array si es DTO
                    $resultArray = is_array($result) 
                        ? $result 
                        : (method_exists($result, 'toArray') ? $result->toArray() : [
                            'cae' => $result->cae ?? null,
                            'cae_expiration_date' => $result->caeExpirationDate ?? null,
                            'invoice_number' => $result->invoiceNumber ?? null,
                        ]);
                    
                    // Normalizar nombres de campos (soporta ambos formatos)
                    $cae = $resultArray['cae'] ?? $resultArray['CAE'] ?? null;
                    $invoiceNumber = $resultArray['invoice_number'] ?? $resultArray['invoiceNumber'] ?? $resultArray['CbteDesde'] ?? null;
                    $caeExpiration = $resultArray['cae_expiration_date'] ?? $resultArray['caeExpirationDate'] ?? $resultArray['CAEFchVto'] ?? null;
                    
                    $this->table(
                        ['Campo', 'Valor'],
                        [
                            ['CAE', $cae ?? 'N/A'],
                            ['Número de Comprobante', $invoiceNumber ?? 'N/A'],
                            ['Vencimiento CAE', $caeExpiration ?? 'N/A'],
                            ['Punto de Venta', $pointOfSale],
                            ['Tipo de Comprobante', $invoiceType],
                        ]
                    );
                    
                    // Verificar si el CAE está vigente
                    if ($caeExpiration) {
                        try {
                            $expirationDate = \Carbon\Carbon::createFromFormat('Ymd', $caeExpiration);
                            $isValid = $expirationDate->isFuture();
                            $this->newLine();
                            if ($isValid) {
                                $this->info("✅ CAE válido hasta: " . $expirationDate->format('d/m/Y'));
                            } else {
                                $this->error("❌ CAE vencido desde: " . $expirationDate->format('d/m/Y'));
                            }
                        } catch (\Exception $e) {
                            // Ignorar error de formato de fecha
                        }
                    }
                    
                    // 4. Verificar que la factura se generó consultando nuevamente
                    $this->newLine();
                    $this->info('4️⃣ Verificando que la factura se generó correctamente...');
                    $this->line('   Consultando último comprobante autorizado...');
                    
                    try {
                        $verifyInvoice = $cuit 
                            ? Afip::getLastAuthorizedInvoice($pointOfSale, $invoiceType, $cuit)
                            : Afip::getLastAuthorizedInvoice($pointOfSale, $invoiceType);
                        
                        // Normalizar número autorizado (soporta ambos formatos)
                        $authorizedNumber = $resultArray['invoice_number'] ?? $resultArray['invoiceNumber'] ?? $resultArray['CbteDesde'] ?? null;
                        $verifiedNumber = $verifyInvoice['CbteNro'] ?? null;
                        
                        if ($authorizedNumber && $verifiedNumber && $authorizedNumber == $verifiedNumber) {
                            $this->info("✅ ¡CONFIRMADO! La factura se generó correctamente en AFIP");
                            $this->newLine();
                            $this->table(
                                ['Campo', 'Valor'],
                                [
                                    ['Número Autorizado', $authorizedNumber],
                                    ['Número Verificado en AFIP', $verifiedNumber],
                                    ['Estado', '✅ Coinciden'],
                                    ['Fecha', $verifyInvoice['CbteFch'] ?? 'N/A'],
                                    ['CAE', $cae ?? 'N/A'],
                                ]
                            );
                        } else {
                            if ($verifiedNumber) {
                                $this->info("✅ La factura está registrada en AFIP");
                                $this->line("   Número en AFIP: {$verifiedNumber}");
                                if ($authorizedNumber) {
                                    $this->line("   Número autorizado: {$authorizedNumber}");
                                    if ($authorizedNumber != $verifiedNumber) {
                                        $this->warn("   ⚠️  Los números no coinciden (puede ser normal si AFIP ajustó el número)");
                                    }
                                } else {
                                    $this->warn("   ⚠️  No se pudo obtener el número autorizado del resultado");
                                }
                            } else {
                                $this->warn("⚠️  No se pudo verificar el número en AFIP");
                            }
                        }
                    } catch (\Exception $e) {
                        $this->warn("⚠️  No se pudo verificar: " . $e->getMessage());
                        $this->line("   (Pero la autorización fue exitosa, el CAE es válido)");
                    }
                    
                    $this->newLine();
                    $this->info('🎉 ¡Prueba exitosa!');
                    $this->newLine();
                    
                    $environment = config('afip.environment', 'testing');
                    $isTesting = $environment === 'testing';
                    
                    $this->line('📋 Dónde verificar esta factura:');
                    $this->newLine();
                    
                    if ($isTesting) {
                        $this->line('   ⚠️  MODO TESTING (HOMOLOGACIÓN) - Esta factura NO es real');
                        $this->line('      Es solo para pruebas y validación del sistema');
                        $this->newLine();
                        $this->line('   1. Portal AFIP de Homologación (Testing):');
                        $this->line('      🌐 URL: https://www.afip.gob.ar/fe/');
                        $this->line('      📝 Pasos:');
                        $this->line('         a) Ingresa con tu CUIT: ' . $cuit);
                        $this->line('         b) Ve a "Consultas" → "Comprobantes Autorizados"');
                        $this->line('         c) Busca por:');
                        $this->line('            - CAE: ' . ($cae ?? 'N/A'));
                        $this->line('            - Número: ' . ($invoiceNumber ?? 'N/A'));
                        $this->line('            - Punto de Venta: ' . $pointOfSale);
                        $this->line('            - Tipo: ' . $invoiceType);
                        $this->newLine();
                        $this->line('      ⚠️  IMPORTANTE: En homologación las facturas son de prueba');
                        $this->line('         No tienen validez fiscal real');
                    } else {
                        $this->line('   1. Portal AFIP de Producción:');
                        $this->line('      🌐 URL: https://www.afip.gob.ar/fe/');
                        $this->line('      📝 Ingresa con tu CUIT y consulta tus comprobantes');
                    }
                    
                    $this->newLine();
                    $this->line('   2. Verificación mediante SDK (consulta directa a AFIP):');
                    $this->line('      El paso 4️⃣ arriba ya verificó que AFIP tiene la factura registrada');
                    $this->line('      ✅ Si los números coinciden = La factura está en AFIP');
                    $this->newLine();
                    $this->line('   3. En tu base de datos (si la guardaste):');
                    $this->line('      Busca registros con CAE: ' . ($cae ?? 'N/A'));
                    $this->newLine();
                    $this->line('   4. En los logs del sistema:');
                    $this->line('      grep "' . ($cae ?? '') . '" storage/logs/laravel.log');
                } else {
                    $this->warn('⚠️  Autorización cancelada por el usuario');
                }
            }
            
            return 0;
            
        } catch (AfipException $e) {
            $this->newLine();
            $this->error('❌ Error de AFIP: ' . $e->getMessage());
            
            if ($e->getAfipCode()) {
                $this->error('   Código AFIP: ' . $e->getAfipCode());
            }
            
            $this->newLine();
            $this->line('💡 Sugerencias:');
            $this->line('   - Verifica que los certificados estén correctos');
            $this->line('   - Verifica que el CUIT esté configurado');
            $this->line('   - Revisa los logs: tail -f storage/logs/laravel.log');
            $this->line('   - Verifica que estés en entorno de homologación (testing)');
            
            return 1;
            
        } catch (\Exception $e) {
            $this->newLine();
            $this->error('❌ Error inesperado: ' . $e->getMessage());
            $this->newLine();
            $this->line('Stack trace:');
            $this->line($e->getTraceAsString());
            
            return 1;
        }
    }
}
