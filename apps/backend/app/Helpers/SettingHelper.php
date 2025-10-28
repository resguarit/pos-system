<?php

declare(strict_types=1);

namespace App\Helpers;

use App\Models\Setting;

class SettingHelper
{
    /**
     * Get a setting value by key
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function get(string $key, $default = null)
    {
        $setting = Setting::where('key', $key)->first();
        
        if (!$setting) {
            return $default;
        }

        $value = $setting->value;
        
        // Try to decode JSON
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }
        
        return $value ?? $default;
    }

    /**
     * Set a setting value
     *
     * @param string $key
     * @param mixed $value
     * @return Setting
     */
    public static function set(string $key, $value): Setting
    {
        return Setting::updateOrCreate(
            ['key' => $key],
            ['value' => json_encode($value)]
        );
    }

    /**
     * Get multiple settings at once
     *
     * @param array<string> $keys
     * @return array<string, mixed>
     */
    public static function getMany(array $keys): array
    {
        $settings = Setting::whereIn('key', $keys)
            ->get()
            ->mapWithKeys(function ($setting) {
                $value = $setting->value;
                $decoded = json_decode($value, true);
                
                return [$setting->key => json_last_error() === JSON_ERROR_NONE ? $decoded : $value];
            })
            ->toArray();

        return $settings;
    }
}

