<?php

namespace App\Http\Controllers;

use App\Models\ArcaCertificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Controller para gestión de certificados ARCA (multi-CUIT)
 * 
 * Maneja el CRUD de certificados y la subida de archivos .crt y .key
 * para permitir facturación electrónica con múltiples CUITs.
 */
class ArcaCertificateController extends Controller
{
    /**
     * List all certificates
     */
    public function index(Request $request): JsonResponse
    {
        $query = ArcaCertificate::query();

        if ($request->has('active')) {
            $query->where('active', $request->boolean('active'));
        }

        if ($request->has('environment')) {
            $query->where('environment', $request->input('environment'));
        }

        if ($request->has('valid')) {
            $query->valid();
        }

        $certificates = $query->orderBy('razon_social')->get();

        // Sync status for each certificate
        foreach ($certificates as $cert) {
            $cert->syncCertificateStatus();
        }

        return response()->json([
            'success' => true,
            'data' => $certificates->map(function (ArcaCertificate $cert) {
                return [
                    'id' => $cert->id,
                    'cuit' => $cert->cuit,
                    'formatted_cuit' => $cert->formatted_cuit,
                    'razon_social' => $cert->razon_social,
                    'alias' => $cert->alias,
                    'display_name' => $cert->display_name,
                    'environment' => $cert->environment,
                    'valid_from' => $cert->valid_from?->format('Y-m-d'),
                    'valid_to' => $cert->valid_to?->format('Y-m-d'),
                    'active' => $cert->active,
                    'has_certificate' => $cert->has_certificate,
                    'has_private_key' => $cert->has_private_key,
                    'is_valid' => $cert->isValid(),
                    'is_expiring_soon' => $cert->isExpiringSoon(),
                    'notes' => $cert->notes,
                    'iibb' => $cert->iibb,
                    'fecha_inicio_actividades' => $cert->fecha_inicio_actividades?->format('Y-m-d'),
                ];
            }),
            'count' => $certificates->count(),
        ]);
    }

    /**
     * Get valid certificates for use (dropdown, etc)
     */
    public function getValid(Request $request): JsonResponse
    {
        $environment = $request->input('environment', config('arca.environment', 'testing'));

        // Sync status from disk so manually placed .crt/.key are detected
        $allForEnv = ArcaCertificate::forEnvironment($environment)->get();
        foreach ($allForEnv as $cert) {
            /** @var ArcaCertificate $cert */
            $cert->syncCertificateStatus();
        }

        $certificates = ArcaCertificate::valid()
            ->forEnvironment($environment)
            ->orderBy('razon_social')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $certificates->map(function (ArcaCertificate $cert) {
                return [
                    'cuit' => $cert->cuit,
                    'formatted_cuit' => $cert->formatted_cuit,
                    'razon_social' => $cert->razon_social,
                    'display_name' => $cert->display_name,
                    'valid_to' => $cert->valid_to?->format('Y-m-d'),
                    'is_expiring_soon' => $cert->isExpiringSoon(),
                    'iibb' => $cert->iibb,
                    'fecha_inicio_actividades' => $cert->fecha_inicio_actividades?->format('Y-m-d'),
                ];
            }),
            'count' => $certificates->count(),
        ]);
    }

    /**
     * Create a new certificate entry
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cuit' => 'required|string|size:11|unique:afip_certificates,cuit',
            'razon_social' => 'required|string|max:255',
            'environment' => 'sometimes|in:production,testing',
            'alias' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'iibb' => 'nullable|string|max:50',
            'fecha_inicio_actividades' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $data['cuit'] = preg_replace('/[^0-9]/', '', $data['cuit']);

        $certificate = ArcaCertificate::create($data);
        $certificate->ensureDirectoryExists();
        // Sync with existing files on disk (e.g. when .crt/.key were placed manually)
        $certificate->syncCertificateStatus();

        return response()->json([
            'success' => true,
            'message' => 'Certificado registrado exitosamente',
            'data' => $certificate->fresh(),
        ], 201);
    }

    /**
     * Show a specific certificate
     */
    public function show(ArcaCertificate $arcaCertificate): JsonResponse
    {
        $arcaCertificate->syncCertificateStatus();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $arcaCertificate->id,
                'cuit' => $arcaCertificate->cuit,
                'formatted_cuit' => $arcaCertificate->formatted_cuit,
                'razon_social' => $arcaCertificate->razon_social,
                'alias' => $arcaCertificate->alias,
                'display_name' => $arcaCertificate->display_name,
                'environment' => $arcaCertificate->environment,
                'valid_from' => $arcaCertificate->valid_from?->format('Y-m-d'),
                'valid_to' => $arcaCertificate->valid_to?->format('Y-m-d'),
                'active' => $arcaCertificate->active,
                'has_certificate' => $arcaCertificate->has_certificate,
                'has_private_key' => $arcaCertificate->has_private_key,
                'is_valid' => $arcaCertificate->isValid(),
                'is_expiring_soon' => $arcaCertificate->isExpiringSoon(),
                'certificate_path' => $arcaCertificate->certificate_path,
                'notes' => $arcaCertificate->notes,
                'iibb' => $arcaCertificate->iibb,
                'fecha_inicio_actividades' => $arcaCertificate->fecha_inicio_actividades?->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * Update a certificate entry
     */
    public function update(Request $request, ArcaCertificate $arcaCertificate): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'razon_social' => 'sometimes|string|max:255',
            'environment' => 'sometimes|in:production,testing',
            'alias' => 'nullable|string|max:100',
            'active' => 'sometimes|boolean',
            'notes' => 'nullable|string',
            'iibb' => 'nullable|string|max:50',
            'fecha_inicio_actividades' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors' => $validator->errors(),
            ], 422);
        }

        $arcaCertificate->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Certificado actualizado exitosamente',
            'data' => $arcaCertificate,
        ]);
    }

    /**
     * Upload certificate file
     */
    public function uploadCertificate(Request $request, ArcaCertificate $arcaCertificate): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'certificate' => 'required|file|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Archivo inválido',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $content = file_get_contents($request->file('certificate')->getRealPath());

            // Validate it's a valid certificate
            $certInfo = openssl_x509_parse($content);
            if (!$certInfo) {
                return response()->json([
                    'success' => false,
                    'message' => 'El archivo no es un certificado válido',
                ], 422);
            }

            $arcaCertificate->storeCertificate($content);

            return response()->json([
                'success' => true,
                'message' => 'Certificado subido exitosamente',
                'data' => [
                    'valid_from' => $arcaCertificate->valid_from?->format('Y-m-d'),
                    'valid_to' => $arcaCertificate->valid_to?->format('Y-m-d'),
                    'has_certificate' => true,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error uploading certificate', [
                'cuit' => $arcaCertificate->cuit,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al subir el certificado: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload private key file
     */
    public function uploadPrivateKey(Request $request, ArcaCertificate $arcaCertificate): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'private_key' => 'required|file|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Archivo inválido',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $content = file_get_contents($request->file('private_key')->getRealPath());

            // Validate it's a valid private key
            $key = openssl_pkey_get_private($content);
            if (!$key) {
                return response()->json([
                    'success' => false,
                    'message' => 'El archivo no es una clave privada válida',
                ], 422);
            }

            $arcaCertificate->storePrivateKey($content);

            return response()->json([
                'success' => true,
                'message' => 'Clave privada subida exitosamente',
                'data' => [
                    'has_private_key' => true,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error uploading private key', [
                'cuit' => $arcaCertificate->cuit,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al subir la clave privada: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a certificate
     */
    public function destroy(ArcaCertificate $arcaCertificate): JsonResponse
    {
        // Soft delete - keep the record but mark as deleted
        $arcaCertificate->delete();

        return response()->json([
            'success' => true,
            'message' => 'Certificado eliminado exitosamente',
        ]);
    }

    /**
     * Check if a CUIT has a valid certificate
     */
    public function checkCuit(Request $request): JsonResponse
    {
        $cuit = preg_replace('/[^0-9]/', '', $request->input('cuit', ''));

        if (strlen($cuit) !== 11) {
            return response()->json([
                'success' => false,
                'message' => 'CUIT inválido',
                'has_certificate' => false,
            ], 422);
        }

        $certificate = ArcaCertificate::findByCuit($cuit);

        if (!$certificate) {
            return response()->json([
                'success' => true,
                'has_certificate' => false,
                'message' => 'No existe certificado registrado para este CUIT',
            ]);
        }

        $certificate->syncCertificateStatus();

        return response()->json([
            'success' => true,
            'has_certificate' => true,
            'is_valid' => $certificate->isValid(),
            'data' => [
                'cuit' => $certificate->cuit,
                'razon_social' => $certificate->razon_social,
                'environment' => $certificate->environment,
                'has_files' => $certificate->has_certificate && $certificate->has_private_key,
                'valid_to' => $certificate->valid_to?->format('Y-m-d'),
                'is_expiring_soon' => $certificate->isExpiringSoon(),
            ],
        ]);
    }
}

