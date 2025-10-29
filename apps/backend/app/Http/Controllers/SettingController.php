<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class SettingController extends Controller
{
    // Default system settings keys
    private const SYSTEM_KEYS = [
        'logo_url',
        'favicon_url',
        'system_title',
        'primary_color',
        'company_name',
        'company_ruc',
        'company_address',
        'company_email',
        'company_phone',
    ];

    public function index()
    {
        $settings = Setting::all();
        return response()->json(['data' => $settings]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required'
        ]);

        $savedSettings = [];
        
        DB::beginTransaction();
        try {
            foreach ($request->settings as $setting) {
                $savedSetting = Setting::updateOrCreate(
                    ['key' => $setting['key']],
                    ['value' => $setting['value']]
                );
                $savedSettings[] = $savedSetting;
            }
            
            DB::commit();
            return response()->json(['data' => $savedSettings], 201);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al guardar la configuración',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get system configuration
     */
    public function getSystem()
    {
        try {
            $settings = Setting::whereIn('key', self::SYSTEM_KEYS)
                ->pluck('value', 'key')
                ->toArray();

            // Set defaults for missing settings
            $defaults = [
                'system_title' => 'RG Gestión',
                'primary_color' => '#3B82F6',
                'company_name' => '',
                'company_ruc' => '',
                'company_address' => '',
                'company_email' => '',
                'company_phone' => '',
                'logo_url' => null,
                'favicon_url' => null,
            ];

            $config = array_merge($defaults, $settings);

            // Convert json values
            foreach ($config as $key => $value) {
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    if (json_last_error() === JSON_ERROR_NONE && !is_null($decoded)) {
                        $config[$key] = $decoded;
                    }
                }
            }

            return response()->json($config);
        } catch (\Exception $e) {
            Log::error('Error getting system configuration', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Error al obtener la configuración del sistema',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update system configuration
     */
    public function updateSystem(Request $request)
    {
        $request->validate([
            'system_title' => 'nullable|string|max:255',
            'primary_color' => 'nullable|string|max:7',
            'company_name' => 'nullable|string|max:255',
            'company_ruc' => 'nullable|string|max:50',
            'company_address' => 'nullable|string|max:500',
            'company_email' => 'nullable|email|max:255',
            'company_phone' => 'nullable|string|max:50',
            'logo_url' => 'nullable|string|max:500',
            'favicon_url' => 'nullable|string|max:500',
        ]);

        try {
            DB::beginTransaction();

            foreach ($request->all() as $key => $value) {
                if (in_array($key, self::SYSTEM_KEYS)) {
                    Setting::updateOrCreate(
                        ['key' => $key],
                        ['value' => json_encode($value)]
                    );
                }
            }

            DB::commit();
            
            return response()->json([
                'message' => 'Configuración actualizada correctamente',
                'data' => $request->all()
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating system configuration', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Error al actualizar la configuración',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload image (logo or favicon)
     */
    public function uploadImage(Request $request)
    {
        $request->validate([
            'file' => 'required|image|mimes:jpeg,jpg,png,gif,ico|max:2048',
            'type' => 'required|string|in:logo,favicon',
        ]);

        try {
            $file = $request->file('file');
            $type = $request->input('type');
            
            try {
                Log::info('Starting file upload', [
                    'type' => $type,
                    'originalName' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'mimeType' => $file->getMimeType()
                ]);
            } catch (\Exception $logException) {
                // Silently fail if logging is not available
            }
            
            // Create directory if it doesn't exist
            $directory = 'system/' . $type . 's';
            $fullDirectoryPath = storage_path('app/public/' . $directory);
            
            // Ensure directory exists (permissions should be set by server admin)
            if (!file_exists($fullDirectoryPath)) {
                mkdir($fullDirectoryPath, 0775, true);
            }
            
            // Verify directory is writable (don't try to change permissions, just check)
            if (!is_writable($fullDirectoryPath)) {
                throw new \Exception('Directory is not writable: ' . $fullDirectoryPath . '. Please check file permissions on the server.');
            }
            
            // Store file and get path
            $path = $file->store($directory, 'public');
            
            if (!$path) {
                // Try to get more information about the error
                $storagePath = storage_path('app/public');
                $writable = is_writable($storagePath);
                $diskInfo = [
                    'storage_path' => $storagePath,
                    'storage_writable' => $writable,
                    'directory_path' => $fullDirectoryPath,
                    'directory_exists' => file_exists($fullDirectoryPath),
                    'directory_writable' => is_writable($fullDirectoryPath),
                    'file_size' => $file->getSize(),
                    'file_mime' => $file->getMimeType(),
                ];
                
                throw new \Exception('Failed to store file - path is empty. Storage info: ' . json_encode($diskInfo));
            }
            
            try {
                Log::info('File stored successfully', ['path' => $path]);
            } catch (\Exception $logException) {
                // Silently fail if logging is not available
            }
            
            // Generate public URL manually to ensure it's correct
            $baseUrl = config('app.url');
            
            // Remove /api if present in APP_URL  
            if (str_ends_with($baseUrl, '/api')) {
                $baseUrl = str_replace('/api', '', $baseUrl);
            }
            
            // Construct the full URL
            $url = rtrim($baseUrl, '/') . '/storage/' . $path;
            
            try {
                Log::info('Storage URL generated', [
                    'path' => $path,
                    'baseUrl' => $baseUrl,
                    'url' => $url
                ]);
            } catch (\Exception $logException) {
                // Silently fail if logging is not available
            }
            
            // Save setting (json_encode to match getSystem behavior)
            $key = $type === 'logo' ? 'logo_url' : 'favicon_url';
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => json_encode($url)]
            );
            
            try {
                Log::info('Setting saved successfully', ['key' => $key, 'url' => $url]);
            } catch (\Exception $logException) {
                // Silently fail if logging is not available
            }

            return response()->json([
                'message' => 'Imagen subida correctamente',
                'url' => $url,
                'path' => $path
            ]);
        } catch (ValidationException $e) {
            // Let validation exceptions bubble up to be handled by exception handler
            throw $e;
        } catch (\Exception $e) {
            // Try to log, but don't fail if logging itself fails
            try {
                Log::error('Error uploading image', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            } catch (\Exception $logException) {
                // Silently fail if logging is not available
            }
            
            // Build error response
            $response = response()->json([
                'message' => 'Error al subir la imagen',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor'
            ], 500);
            
            // Add CORS headers manually
            $origin = $request->header('Origin');
            $allowedOrigins = config('cors.allowed_origins', []);
            $allowedPatterns = config('cors.allowed_origins_patterns', []);
            
            $isAllowed = false;
            if ($origin) {
                if (in_array('*', $allowedOrigins) || in_array($origin, $allowedOrigins)) {
                    $isAllowed = true;
                } elseif (!empty($allowedPatterns)) {
                    foreach ($allowedPatterns as $pattern) {
                        if (preg_match('#^' . $pattern . '$#', $origin)) {
                            $isAllowed = true;
                            break;
                        }
                    }
                }
            }
            
            if ($isAllowed) {
                $response->headers->set('Access-Control-Allow-Origin', $origin);
                $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
                if (config('cors.supports_credentials', false)) {
                    $response->headers->set('Access-Control-Allow-Credentials', 'true');
                }
            }
            
            return $response;
        }
    }

    /**
     * Get a specific setting value
     */
    public function get(string $key)
    {
        try {
            $setting = Setting::where('key', $key)->first();
            
            if (!$setting) {
                return response()->json([
                    'message' => 'Configuración no encontrada'
                ], 404);
            }

            return response()->json([
                'key' => $setting->key,
                'value' => is_string($setting->value) && json_decode($setting->value, true) !== null 
                    ? json_decode($setting->value, true) 
                    : $setting->value
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting setting', ['key' => $key, 'error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Error al obtener la configuración',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
