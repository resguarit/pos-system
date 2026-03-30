<?php

// Get frontend URL from environment (without trailing slash)
$frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
$frontendDomain = parse_url($frontendUrl, PHP_URL_HOST) ?? 'localhost';

// Also infer frontend domain from APP_URL when hosted behind api.<domain>
$appUrl = rtrim((string) env('APP_URL', ''), '/');
$appHost = $appUrl ? (parse_url($appUrl, PHP_URL_HOST) ?? '') : '';
$inferredFrontendDomain = '';
if (is_string($appHost) && $appHost !== '' && str_starts_with($appHost, 'api.')) {
    $inferredFrontendDomain = substr($appHost, 4) ?: '';
}

// Build allowed origins dynamically
$allowedOrigins = [$frontendUrl];

// Add opposite protocol (http <-> https)
if (strpos($frontendUrl, 'https://') === 0) {
    $allowedOrigins[] = str_replace('https://', 'http://', $frontendUrl);
} elseif (strpos($frontendUrl, 'http://') === 0) {
    $allowedOrigins[] = str_replace('http://', 'https://', $frontendUrl);
}

// Add www variant if domain is not localhost
if ($frontendDomain !== 'localhost' && $frontendDomain !== '127.0.0.1') {
    $wwwUrl = preg_replace('/^(https?:\/\/)(.*)$/', '$1www.$2', $frontendUrl);
    $allowedOrigins[] = $wwwUrl;
    // Add opposite protocol for www variant
    if (strpos($wwwUrl, 'https://') === 0) {
        $allowedOrigins[] = str_replace('https://', 'http://', $wwwUrl);
    } elseif (strpos($wwwUrl, 'http://') === 0) {
        $allowedOrigins[] = str_replace('http://', 'https://', $wwwUrl);
    }
}

// Add local development origins
$allowedOrigins = array_merge($allowedOrigins, [
    'http://localhost:5173',
    'https://localhost:5173',
    'http://127.0.0.1:5173',
    'https://127.0.0.1:5173',
]);

// Add inferred production frontend origins (apex + www) if available
if (is_string($inferredFrontendDomain) && $inferredFrontendDomain !== '') {
    $allowedOrigins[] = 'https://' . $inferredFrontendDomain;
    $allowedOrigins[] = 'https://www.' . $inferredFrontendDomain;
}

// Remove duplicates and reindex
$allowedOrigins = array_values(array_unique($allowedOrigins));

// Build allowed origins patterns
$allowedOriginsPatterns = [
    '^(http|https)://(localhost|127\\.0\\.0\\.1):5173$',
];

// Add domain pattern if domain is not localhost
if ($frontendDomain !== 'localhost' && $frontendDomain !== '127.0.0.1') {
    $domainPattern = str_replace('.', '\\.', $frontendDomain);
    // Allow apex domain and www
    $allowedOriginsPatterns[] = '^https?://(www\\.)?' . $domainPattern . '$';
    // Allow any subdomain
    $allowedOriginsPatterns[] = '^https?://.*\\.' . $domainPattern . '$';
}

// Add inferred domain patterns (apex + www + subdomains)
if (is_string($inferredFrontendDomain) && $inferredFrontendDomain !== '' && $inferredFrontendDomain !== 'localhost' && $inferredFrontendDomain !== '127.0.0.1') {
    $inferredPattern = str_replace('.', '\\.', $inferredFrontendDomain);
    $allowedOriginsPatterns[] = '^https?://(www\\.)?' . $inferredPattern . '$';
    $allowedOriginsPatterns[] = '^https?://.*\\.' . $inferredPattern . '$';
}

return [
    'paths' => ['api/*', 'storage/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $allowedOrigins,
    'allowed_origins_patterns' => $allowedOriginsPatterns,
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
