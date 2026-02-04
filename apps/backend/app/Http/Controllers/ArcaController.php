<?php

namespace App\Http\Controllers;

use App\Models\ArcaCertificate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Resguar\AfipSdk\Services\AfipService;
use Resguar\AfipSdk\Services\CertificateManager;
use Resguar\AfipSdk\Exceptions\AfipException;
use Illuminate\Support\Facades\Log;

/**
 * Controlador para operaciones con ARCA (anteriormente AFIP)
 * 
 * Proporciona endpoints para obtener parámetros de ARCA como
 * tipos de comprobantes y puntos de venta habilitados por CUIT.
 * 
 * Soporta múltiples CUITs usando certificados de la tabla afip_certificates.
 */
class ArcaController extends Controller
{
    /**
     * Constructor
     */
    public function __construct(
        private readonly AfipService $afip,
        private readonly CertificateManager $certificateManager
    ) {
    }

    /**
     * Cargar certificado para un CUIT específico
     * 
     * Busca el certificado en la tabla afip_certificates y lo carga en el SDK.
     * 
     * @param string $cuit CUIT limpio (11 dígitos)
     * @return array{success: bool, message?: string, certificate?: ArcaCertificate}
     */
    private function loadCertificateForCuit(string $cuit): array
    {
        // Buscar certificado en la base de datos
        $certificate = ArcaCertificate::where('cuit', $cuit)
            ->where('active', true)
            ->first();

        if (!$certificate) {
            return [
                'success' => false,
                'message' => "No hay certificado configurado para el CUIT {$cuit}. Configure uno en Configuración > ARCA.",
            ];
        }

        // Verificar que tenga los archivos
        if (!$certificate->has_certificate || !$certificate->has_private_key) {
            return [
                'success' => false,
                'message' => "El certificado para CUIT {$cuit} no tiene los archivos completos. Suba el certificado y la clave privada.",
            ];
        }

        // Verificar que el certificado no esté expirado
        if (!$certificate->isValid()) {
            $reason = !$certificate->active 
                ? 'está desactivado' 
                : ($certificate->valid_to && $certificate->valid_to->isPast() 
                    ? 'está expirado' 
                    : 'no tiene los archivos necesarios');
            return [
                'success' => false,
                'message' => "El certificado para CUIT {$cuit} {$reason}.",
            ];
        }

        // Verificar que los archivos existan en disco
        if (!file_exists($certificate->certificate_path)) {
            return [
                'success' => false,
                'message' => "Archivo de certificado no encontrado en disco para CUIT {$cuit}.",
            ];
        }

        if (!file_exists($certificate->private_key_path)) {
            return [
                'success' => false,
                'message' => "Archivo de clave privada no encontrado en disco para CUIT {$cuit}.",
            ];
        }

        // Cargar certificado en el SDK
        try {
            $this->certificateManager->setCertificatePaths(
                $certificate->certificate_path,
                $certificate->private_key_path
            );

            Log::info('Certificado ARCA cargado correctamente', [
                'cuit' => $cuit,
                'certificate_path' => $certificate->certificate_path,
            ]);

            return [
                'success' => true,
                'certificate' => $certificate,
            ];
        } catch (\Exception $e) {
            Log::error('Error al cargar certificado ARCA', [
                'cuit' => $cuit,
                'error' => $e->getMessage(),
            ]);
            return [
                'success' => false,
                'message' => "Error al cargar certificado: {$e->getMessage()}",
            ];
        }
    }

    /**
     * Obtener tipos de comprobantes disponibles para un CUIT
     * 
     * Este endpoint permite obtener los tipos de comprobantes que
     * un CUIT puede emitir según ARCA. Si no se proporciona CUIT,
     * usa el configurado globalmente.
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getReceiptTypes(Request $request): JsonResponse
    {
        try {
            // Obtener CUIT del request o usar el de configuración
            $cuit = $request->input('cuit');

            // Si se proporciona CUIT, validarlo y limpiarlo
            if ($cuit) {
                $cuit = preg_replace('/[^0-9]/', '', $cuit);

                if (strlen($cuit) !== 11) {
                    return response()->json([
                        'success' => false,
                        'message' => 'El CUIT debe tener exactamente 11 dígitos',
                        'data' => [],
                    ], 422);
                }
            } else {
                // Usar CUIT de configuración
                $cuit = config('arca.cuit');

                if (!$cuit) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se proporcionó CUIT y no hay CUIT configurado en el sistema',
                        'data' => [],
                    ], 422);
                }
            }

            // Cargar certificado para el CUIT
            $certResult = $this->loadCertificateForCuit($cuit);
            if (!$certResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $certResult['message'],
                    'data' => [],
                ], 422);
            }

            // Obtener tipos de comprobantes según condición fiscal del CUIT
            $result = $this->afip->getReceiptTypesForCuit($cuit);

            return response()->json([
                'success' => true,
                'message' => 'Tipos de comprobantes obtenidos exitosamente',
                'data' => $result['receipt_types'] ?? [],
                'condicion_iva' => $result['condicion_iva'] ?? null,
                'razon_social' => $result['razon_social'] ?? null,
                'count' => count($result['receipt_types'] ?? []),
                'cuit' => $cuit,
            ]);

        } catch (AfipException $e) {
            Log::error('Error de ARCA al obtener tipos de comprobantes', [
                'error' => $e->getMessage(),
                'afip_code' => method_exists($e, 'getAfipCode') ? $e->getAfipCode() : null,
                'cuit' => $cuit ?? null,
            ]);

            // Si ARCA no devuelve resultados, retornar array vacío en lugar de error
            if (str_contains($e->getMessage(), 'Sin Resultados') || str_contains($e->getMessage(), '602')) {
                return response()->json([
                    'success' => true,
                    'message' => 'El CUIT no tiene tipos de comprobantes habilitados en ARCA',
                    'data' => [],
                    'count' => 0,
                    'cuit' => $cuit ?? null,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener tipos de comprobantes desde ARCA: ' . $e->getMessage(),
                'data' => [],
            ], 422);

        } catch (\Exception $e) {
            Log::error('Error inesperado al obtener tipos de comprobantes', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'cuit' => $cuit ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error inesperado al obtener tipos de comprobantes: ' . $e->getMessage(),
                'data' => [],
            ], 500);
        }
    }

    /**
     * Obtener puntos de venta habilitados para un CUIT
     * 
     * Este endpoint permite obtener los puntos de venta (establecimientos)
     * que un CUIT tiene habilitados en ARCA. Si no se proporciona CUIT,
     * usa el configurado globalmente.
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getPointsOfSale(Request $request): JsonResponse
    {
        try {
            // Obtener CUIT del request o usar el de configuración
            $cuit = $request->input('cuit');

            // Si se proporciona CUIT, validarlo y limpiarlo
            if ($cuit) {
                $cuit = preg_replace('/[^0-9]/', '', $cuit);

                if (strlen($cuit) !== 11) {
                    return response()->json([
                        'success' => false,
                        'message' => 'El CUIT debe tener exactamente 11 dígitos',
                        'data' => [],
                    ], 422);
                }
            } else {
                // Usar CUIT de configuración
                $cuit = config('arca.cuit');

                if (!$cuit) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se proporcionó CUIT y no hay CUIT configurado en el sistema',
                        'data' => [],
                    ], 422);
                }
            }

            // Cargar certificado para el CUIT
            $certResult = $this->loadCertificateForCuit($cuit);
            if (!$certResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $certResult['message'],
                    'data' => [],
                ], 422);
            }

            // Obtener puntos de venta desde ARCA
            $pointsOfSale = $this->afip->getAvailablePointsOfSale($cuit);

            return response()->json([
                'success' => true,
                'message' => 'Puntos de venta obtenidos exitosamente',
                'data' => $pointsOfSale,
                'count' => count($pointsOfSale),
                'cuit' => $cuit,
            ]);

        } catch (AfipException $e) {
            Log::error('Error de ARCA al obtener puntos de venta', [
                'error' => $e->getMessage(),
                'afip_code' => method_exists($e, 'getAfipCode') ? $e->getAfipCode() : null,
                'cuit' => $cuit ?? null,
            ]);

            // Si ARCA no devuelve resultados, retornar array vacío en lugar de error
            if (str_contains($e->getMessage(), 'Sin Resultados') || str_contains($e->getMessage(), '602')) {
                return response()->json([
                    'success' => true,
                    'message' => 'El CUIT no tiene puntos de venta habilitados en ARCA',
                    'data' => [],
                    'count' => 0,
                    'cuit' => $cuit ?? null,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener puntos de venta desde ARCA: ' . $e->getMessage(),
                'data' => [],
            ], 422);

        } catch (\Exception $e) {
            Log::error('Error inesperado al obtener puntos de venta', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'cuit' => $cuit ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error inesperado al obtener puntos de venta: ' . $e->getMessage(),
                'data' => [],
            ], 500);
        }
    }

    /**
     * Verificar si la facturación electrónica está habilitada
     * 
     * Este endpoint permite verificar si el sistema tiene configurado
     * ARCA y puede realizar operaciones de facturación electrónica.
     * 
     * Incluye información sobre certificados multi-CUIT disponibles.
     * 
     * @return JsonResponse
     */
    public function checkAfipStatus(): JsonResponse
    {
        try {
            $defaultCuit = config('arca.cuit');
            $environment = config('arca.environment', 'testing');

            // Obtener todos los certificados válidos del sistema
            $validCertificates = ArcaCertificate::valid()
                ->forEnvironment($environment)
                ->get(['id', 'cuit', 'razon_social', 'alias', 'valid_from', 'valid_to', 'environment']);

            $hasValidCertificates = $validCertificates->isNotEmpty();

            // Si hay CUIT por defecto, verificar si tiene certificado
            $defaultCertificateValid = false;
            if ($defaultCuit) {
                $cleanCuit = preg_replace('/[^0-9]/', '', $defaultCuit);
                $defaultCertificateValid = $validCertificates->contains('cuit', $cleanCuit);
            }

            // El sistema está habilitado si hay al menos un certificado válido
            $isEnabled = $hasValidCertificates;

            return response()->json([
                'success' => true,
                'data' => [
                    'enabled' => $isEnabled,
                    'environment' => $environment,
                    'has_cuit' => !empty($defaultCuit),
                    'cuit' => $defaultCuit ?: null,
                    'default_certificate_valid' => $defaultCertificateValid,
                    'valid_certificates_count' => $validCertificates->count(),
                    'valid_certificates' => $validCertificates->map(function ($cert) {
                        return [
                            'id' => $cert->id,
                            'cuit' => $cert->cuit,
                            'razon_social' => $cert->razon_social,
                            'alias' => $cert->alias,
                            'valid_to' => $cert->valid_to?->toDateString(),
                        ];
                    }),
                    // Compatibilidad con frontend antiguo
                    'has_certificates_config' => $hasValidCertificates,
                    'certificates_exist' => $hasValidCertificates,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error al verificar estado de ARCA', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al verificar estado de ARCA',
                'data' => [
                    'enabled' => false,
                    'valid_certificates_count' => 0,
                ],
            ], 500);
        }
    }
}

