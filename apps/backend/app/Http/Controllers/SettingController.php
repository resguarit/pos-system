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
            
            // Generate public URL - Storage::url already includes the full URL from filesystems config
            $url = Storage::url($path);
            
            // If Storage::url includes /api in the URL (e.g., due to APP_URL config), remove it
            // because storage files are served from the domain root, not from /api
            if (str_contains($url, '/api/storage/')) {
                $url = str_replace('/api/storage/', '/storage/', $url);
            }
            
            // Save setting
            $key = $type === 'logo' ? 'logo_url' : 'favicon_url';
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => json_encode($url)]
            );

            return response()->json([
                'message' => 'Imagen subida correctamente',
                'url' => $url,
                'path' => $path,
                'debug' => [
                    'apiBaseUrl' => config('app.url'),
                    'storageUrl' => $storageUrl,
                    'finalUrl' => $url
                ]
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
