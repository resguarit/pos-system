<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Resguar\AfipSdk\Services\AfipService;
use Resguar\AfipSdk\Exceptions\AfipException;
use Illuminate\Support\Facades\Log;

/**
 * Controlador para operaciones con AFIP
 * 
 * Proporciona endpoints para obtener parámetros de AFIP como
 * tipos de comprobantes y puntos de venta habilitados por CUIT.
 */
class AfipController extends Controller
{
    /**
     * Constructor
     */
    public function __construct(
        private readonly AfipService $afip
    ) {}

    /**
     * Obtener tipos de comprobantes disponibles para un CUIT
     * 
     * Este endpoint permite obtener los tipos de comprobantes que
     * un CUIT puede emitir según AFIP. Si no se proporciona CUIT,
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
                $cuit = config('afip.cuit');
                
                if (!$cuit) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se proporcionó CUIT y no hay CUIT configurado en el sistema',
                        'data' => [],
                    ], 422);
                }
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
            Log::error('Error de AFIP al obtener tipos de comprobantes', [
                'error' => $e->getMessage(),
                'afip_code' => method_exists($e, 'getAfipCode') ? $e->getAfipCode() : null,
                'cuit' => $cuit ?? null,
            ]);

            // Si AFIP no devuelve resultados, retornar array vacío en lugar de error
            if (str_contains($e->getMessage(), 'Sin Resultados') || str_contains($e->getMessage(), '602')) {
                return response()->json([
                    'success' => true,
                    'message' => 'El CUIT no tiene tipos de comprobantes habilitados en AFIP',
                    'data' => [],
                    'count' => 0,
                    'cuit' => $cuit ?? null,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener tipos de comprobantes desde AFIP: ' . $e->getMessage(),
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
     * que un CUIT tiene habilitados en AFIP. Si no se proporciona CUIT,
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
                $cuit = config('afip.cuit');
                
                if (!$cuit) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se proporcionó CUIT y no hay CUIT configurado en el sistema',
                        'data' => [],
                    ], 422);
                }
            }

            // Obtener puntos de venta desde AFIP
            $pointsOfSale = $this->afip->getAvailablePointsOfSale($cuit);

            return response()->json([
                'success' => true,
                'message' => 'Puntos de venta obtenidos exitosamente',
                'data' => $pointsOfSale,
                'count' => count($pointsOfSale),
                'cuit' => $cuit,
            ]);

        } catch (AfipException $e) {
            Log::error('Error de AFIP al obtener puntos de venta', [
                'error' => $e->getMessage(),
                'afip_code' => method_exists($e, 'getAfipCode') ? $e->getAfipCode() : null,
                'cuit' => $cuit ?? null,
            ]);

            // Si AFIP no devuelve resultados, retornar array vacío en lugar de error
            if (str_contains($e->getMessage(), 'Sin Resultados') || str_contains($e->getMessage(), '602')) {
                return response()->json([
                    'success' => true,
                    'message' => 'El CUIT no tiene puntos de venta habilitados en AFIP',
                    'data' => [],
                    'count' => 0,
                    'cuit' => $cuit ?? null,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener puntos de venta desde AFIP: ' . $e->getMessage(),
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
     * AFIP y puede realizar operaciones de facturación electrónica.
     * 
     * @return JsonResponse
     */
    public function checkAfipStatus(): JsonResponse
    {
        try {
            $cuit = config('afip.cuit');
            $environment = config('afip.environment', 'testing');
            $certPath = config('afip.certificates.path');
            $certKey = config('afip.certificates.key');
            $certCrt = config('afip.certificates.crt');
            
            $hasConfig = !empty($cuit);
            $hasCertificates = !empty($certPath) && !empty($certKey) && !empty($certCrt);
            
            // Verificar si existen los archivos de certificado
            $certificatesExist = false;
            if ($hasCertificates && $certPath) {
                $keyPath = $certPath . '/' . $certKey;
                $crtPath = $certPath . '/' . $certCrt;
                $certificatesExist = file_exists($keyPath) && file_exists($crtPath);
            }
            
            $isEnabled = $hasConfig && $hasCertificates && $certificatesExist;

            return response()->json([
                'success' => true,
                'data' => [
                    'enabled' => $isEnabled,
                    'environment' => $environment,
                    'has_cuit' => $hasConfig,
                    'has_certificates_config' => $hasCertificates,
                    'certificates_exist' => $certificatesExist,
                    'cuit' => $hasConfig ? $cuit : null,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error al verificar estado de AFIP', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al verificar estado de AFIP',
                'data' => [
                    'enabled' => false,
                ],
            ], 500);
        }
    }
}
