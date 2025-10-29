<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

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

            // Ensure logo and favicon URLs are absolute and use API endpoint
            $appUrl = env('APP_URL', 'http://localhost:8000');
            foreach (['logo_url', 'favicon_url'] as $urlKey) {
                if (!empty($config[$urlKey])) {
                    // Normalize URL to use /api/storage/ endpoint
                    $url = $config[$urlKey];
                    
                    // If it's a relative URL or old /storage/ format, convert to /api/storage/
                    if (str_starts_with($url, '/storage/')) {
                        // Remove /storage/ prefix and add /api/storage/
                        $path = substr($url, 8); // Remove '/storage/'
                        $config[$urlKey] = $appUrl . '/api/storage/' . $path;
                    } elseif (!str_starts_with($url, 'http')) {
                        // Relative URL, make it absolute
                        $config[$urlKey] = $appUrl . '/api/storage/' . ltrim($url, '/');
                    } elseif (str_contains($url, '/storage/') && !str_contains($url, '/api/storage/')) {
                        // Absolute URL with /storage/, convert to /api/storage/
                        $url = str_replace('/storage/', '/api/storage/', $url);
                        $config[$urlKey] = $url;
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
            
            // Create directory if it doesn't exist
            $directory = 'system/' . $type . 's';
            
            // Store file and get path
            $path = $file->store($directory, 'public');
            
            // Generate absolute URL for the stored file
            // Use /api/storage/ instead of /storage/ so it goes through Laravel
            $appUrl = env('APP_URL', 'http://localhost:8000');
            $url = $appUrl . '/api/storage/' . $path;
            
            // Save setting
            $key = $type === 'logo' ? 'logo_url' : 'favicon_url';
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => json_encode($url)]
            );

            return response()->json([
                'message' => 'Imagen subida correctamente',
                'url' => $url,
                'path' => $path
            ]);
        } catch (\Exception $e) {
            Log::error('Error uploading image', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Error al subir la imagen',
                'error' => $e->getMessage()
            ], 500);
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
