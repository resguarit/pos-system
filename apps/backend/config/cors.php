<?php

return [
    'paths' => ['api/*', 'storage/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'https://heroedelwhisky.com.ar',
        'https://www.heroedelwhisky.com.ar',
        'http://localhost:5173',
        'https://localhost:5173',
        'http://127.0.0.1:5173',
        'https://127.0.0.1:5173',
    ],
    'allowed_origins_patterns' => [
        '^(http|https)://(localhost|127\\.0\\.0\\.1):5173$'
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
