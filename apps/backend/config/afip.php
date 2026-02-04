<?php

/**
 * Configuración AFIP SDK
 * 
 * Este archivo mapea la configuración de ARCA a la que espera el SDK.
 * El SDK usa config('afip.*') mientras que la app usa config('arca.*').
 * Este archivo actúa como puente entre ambas configuraciones.
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Entorno de AFIP/ARCA
    |--------------------------------------------------------------------------
    */

    'environment' => env('ARCA_ENVIRONMENT', env('AFIP_ENVIRONMENT', 'testing')),

    /*
    |--------------------------------------------------------------------------
    | CUIT del Contribuyente (por defecto)
    |--------------------------------------------------------------------------
    */

    'cuit' => env('ARCA_CUIT', env('AFIP_CUIT')),

    /*
    |--------------------------------------------------------------------------
    | URLs de los Web Services
    |--------------------------------------------------------------------------
    */

    'wsaa' => [
        'url' => [
            'testing' => 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl',
            'production' => 'https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl',
        ],
    ],

    'wsfe' => [
        'url' => [
            'testing' => 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
            'production' => 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Configuración de Certificados (modo simple - un solo CUIT)
    |--------------------------------------------------------------------------
    */

    'certificates' => [
        'path' => (function () {
            $path = env('ARCA_CERTIFICATES_PATH', env('AFIP_CERTIFICATES_PATH', storage_path('app/afip/certificates')));
            // Resolver rutas relativas
            if ($path && !str_starts_with($path, '/') && !str_starts_with($path, DIRECTORY_SEPARATOR)) {
                if (str_starts_with($path, 'storage/')) {
                    $relativePath = str_replace('storage/', '', $path);
                    $path = storage_path($relativePath);
                } else {
                    $path = base_path($path);
                }
            }
            return $path ?: storage_path('app/afip/certificates');
        })(),
        'key' => env('ARCA_CERTIFICATE_KEY', env('AFIP_CERTIFICATE_KEY', 'private_key.key')),
        'crt' => env('ARCA_CERTIFICATE_CRT', env('AFIP_CERTIFICATE_CRT', 'certificate.crt')),
        'password' => env('ARCA_CERTIFICATE_PASSWORD', env('AFIP_CERTIFICATE_PASSWORD')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Ruta Base para Certificados Multi-CUIT
    |--------------------------------------------------------------------------
    |
    | Estructura esperada:
    |   {certificates_base_path}/{cuit}/certificate.crt
    |   {certificates_base_path}/{cuit}/private.key
    |
    */

    'certificates_base_path' => (function () {
        $path = env('ARCA_CERTIFICATES_BASE_PATH', env('AFIP_CERTIFICATES_BASE_PATH', storage_path('certificates')));
        if ($path === '' || $path === null) {
            return storage_path('certificates');
        }
        // Resolver rutas relativas
        if (!str_starts_with($path, '/') && !preg_match('#^[A-Za-z]:[/\\\\]#', $path)) {
            $path = base_path($path);
        }
        return $path;
    })(),

    /*
    |--------------------------------------------------------------------------
    | Configuración de Cache
    |--------------------------------------------------------------------------
    */

    'cache' => [
        'enabled' => env('ARCA_CACHE_ENABLED', env('AFIP_CACHE_ENABLED', true)),
        'prefix' => env('ARCA_CACHE_PREFIX', env('AFIP_CACHE_PREFIX', 'afip_token_')),
        'ttl' => env('ARCA_CACHE_TTL', env('AFIP_CACHE_TTL', 43200)),
    ],

    /*
    |--------------------------------------------------------------------------
    | Cache de Parámetros
    |--------------------------------------------------------------------------
    */

    'param_cache' => [
        'enabled' => env('ARCA_PARAM_CACHE_ENABLED', env('AFIP_PARAM_CACHE_ENABLED', true)),
        'ttl' => env('ARCA_PARAM_CACHE_TTL', env('AFIP_PARAM_CACHE_TTL', 21600)),
    ],

    /*
    |--------------------------------------------------------------------------
    | Configuración de Reintentos
    |--------------------------------------------------------------------------
    */

    'retry' => [
        'enabled' => env('ARCA_RETRY_ENABLED', env('AFIP_RETRY_ENABLED', true)),
        'max_attempts' => env('ARCA_RETRY_MAX_ATTEMPTS', env('AFIP_RETRY_MAX_ATTEMPTS', 3)),
        'delay' => env('ARCA_RETRY_DELAY', env('AFIP_RETRY_DELAY', 1000)),
    ],

    /*
    |--------------------------------------------------------------------------
    | Configuración de Logging
    |--------------------------------------------------------------------------
    */

    'logging' => [
        'enabled' => env('ARCA_LOGGING_ENABLED', env('AFIP_LOGGING_ENABLED', true)),
        'channel' => env('ARCA_LOGGING_CHANNEL', env('AFIP_LOGGING_CHANNEL', 'daily')),
        'level' => env('ARCA_LOGGING_LEVEL', env('AFIP_LOGGING_LEVEL', 'info')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Timeout de Conexión
    |--------------------------------------------------------------------------
    */

    'timeout' => env('ARCA_TIMEOUT', env('AFIP_TIMEOUT', 30)),

    /*
    |--------------------------------------------------------------------------
    | Configuración SSL
    |--------------------------------------------------------------------------
    */

    'ssl' => [
        'ciphers' => env('AFIP_SSL_CIPHERS', 'DEFAULT:!DH'),
        'security_level' => (int) env('AFIP_SSL_SECURITY_LEVEL', 1),
    ],

    /*
    |--------------------------------------------------------------------------
    | Punto de Venta por Defecto
    |--------------------------------------------------------------------------
    */

    'default_point_of_sale' => env('ARCA_DEFAULT_POINT_OF_SALE', env('AFIP_DEFAULT_POINT_OF_SALE', 1)),
];
