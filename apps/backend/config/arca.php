<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Entorno de ARCA
    |--------------------------------------------------------------------------
    |
    | Especifica el entorno en el que se trabajará:
    | - 'testing': Entorno de homologación/pruebas
    | - 'production': Entorno de producción
    |
    */

    'environment' => env('ARCA_ENVIRONMENT', env('AFIP_ENVIRONMENT', 'testing')),

    /*
    |--------------------------------------------------------------------------
    | CUIT del Contribuyente
    |--------------------------------------------------------------------------
    |
    | CUIT del contribuyente que realizará las operaciones con ARCA
    |
    */

    'cuit' => env('ARCA_CUIT', env('AFIP_CUIT')),

    /*
    |--------------------------------------------------------------------------
    | URLs de los Web Services
    |--------------------------------------------------------------------------
    |
    | URLs de los diferentes servicios web de ARCA según el entorno
    |
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
    | Configuración de Certificados
    |--------------------------------------------------------------------------
    |
    | Ruta y nombres de los archivos de certificados digitales
    |
    */

    'certificates' => [
        'path' => (function () {
            $path = env('ARCA_CERTIFICATES_PATH', storage_path('app/arca/certificates'));
            // Si es una ruta relativa, convertirla a absoluta
            if ($path && !str_starts_with($path, '/') && !str_starts_with($path, DIRECTORY_SEPARATOR)) {
                // Si empieza con "storage/", usar storage_path()
                if (str_starts_with($path, 'storage/')) {
                    $relativePath = str_replace('storage/', '', $path);
                    $path = storage_path($relativePath);
                } else {
                    // Ruta relativa desde la raíz del proyecto
                    $path = base_path($path);
                }
            }
            return $path ?: storage_path('app/arca/certificates');
        })(),
        'key' => env('ARCA_CERTIFICATE_KEY', 'private_key.key'),
        'crt' => env('ARCA_CERTIFICATE_CRT', 'certificate.crt'),
        'password' => env('ARCA_CERTIFICATE_PASSWORD'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Configuración de Cache
    |--------------------------------------------------------------------------
    |
    | Configuración para el cacheo de tokens de autenticación
    | Los tokens de ARCA son válidos por 12 horas según especificación oficial
    |
    */

    'cache' => [
        'enabled' => env('ARCA_CACHE_ENABLED', true),
        'prefix' => env('ARCA_CACHE_PREFIX', 'arca_token_'),
        'ttl' => env('ARCA_CACHE_TTL', 43200), // 12 horas en segundos 
    ],

    /*
    |--------------------------------------------------------------------------
    | Configuración de Reintentos
    |--------------------------------------------------------------------------
    |
    | Configuración para reintentos automáticos en caso de errores temporales
    |
    */

    'retry' => [
        'enabled' => env('ARCA_RETRY_ENABLED', true),
        'max_attempts' => env('ARCA_RETRY_MAX_ATTEMPTS', 3),
        'delay' => env('ARCA_RETRY_DELAY', 1000), // milisegundos
    ],

    /*
    |--------------------------------------------------------------------------
    | Configuración de Logging
    |--------------------------------------------------------------------------
    |
    | Configuración para el registro de operaciones y errores
    |
    */

    'logging' => [
        'enabled' => env('ARCA_LOGGING_ENABLED', true),
        'channel' => env('ARCA_LOGGING_CHANNEL', 'daily'),
        'level' => env('ARCA_LOGGING_LEVEL', 'info'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Timeout de Conexión
    |--------------------------------------------------------------------------
    |
    | Timeout en segundos para las conexiones con los servicios de ARCA
    |
    */

    'timeout' => env('ARCA_TIMEOUT', 30),

    /*
    |--------------------------------------------------------------------------
    | Configuración de Puntos de Venta
    |--------------------------------------------------------------------------
    |
    | Configuración por defecto para puntos de venta
    |
    */

    'default_point_of_sale' => env('ARCA_DEFAULT_POINT_OF_SALE', 1),

    /*
    |--------------------------------------------------------------------------
    | Multi-CUIT Certificate Support
    |--------------------------------------------------------------------------
    |
    | Base path for storing certificates organized by CUIT.
    | Structure: {base_path}/{cuit}/certificate.crt and private.key
    | Always resolved to absolute path so SDK and PHP-FPM find files.
    |
    */

    'certificates_base_path' => (function () {
        // Soportar tanto ARCA_* como AFIP_* para compatibilidad
        $path = env(
            'ARCA_CERTIFICATES_BASE_PATH',
            env(
                'AFIP_CERTIFICATES_BASE_PATH',
                env(
                    'AFIP_CERTIFICATES_PATH', // Fallback a la vieja configuración
                    storage_path('certificates')
                )
            )
        );
        if ($path === '' || $path === null) {
            return storage_path('certificates');
        }
        // Resolve relative paths (e.g. "storage/certificates" in .env) from Laravel base
        if (!str_starts_with($path, '/') && !preg_match('#^[A-Za-z]:[/\\\\]#', $path)) {
            $path = base_path($path);
        }
        return $path;
    })(),

    /*
    |--------------------------------------------------------------------------
    | Cache de Parámetros
    |--------------------------------------------------------------------------
    |
    | Configuración para el cacheo de parámetros de ARCA (puntos de venta,
    | tipos de comprobantes, etc.)
    |
    */

    'param_cache' => [
        'enabled' => env('ARCA_PARAM_CACHE_ENABLED', true),
        'ttl' => env('ARCA_PARAM_CACHE_TTL', 21600), // 6 horas
    ],
];
