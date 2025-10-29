<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'cash.open' => \App\Http\Middleware\CheckCashRegisterOpen::class,
        ]);
        
        // Ensure CORS middleware runs for API routes
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Ensure all API exception responses include CORS headers
        $exceptions->render(function (\Throwable $e, Request $request) {
            // Only handle API routes
            if (!$request->is('api/*')) {
                return null; // Let Laravel handle non-API routes
            }
            
            $statusCode = 500;
            
            if (method_exists($e, 'getStatusCode')) {
                $statusCode = $e->getStatusCode();
            } elseif ($e instanceof ValidationException) {
                $statusCode = 422;
                // Handle validation errors specially
                $response = response()->json([
                    'message' => 'Validation error',
                    'errors' => $e->errors(),
                ], $statusCode);
                
                // Add CORS headers for validation errors
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
                    $response->headers->set('Access-Control-Allow-Methods', implode(', ', config('cors.allowed_methods', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])));
                    $response->headers->set('Access-Control-Allow-Headers', implode(', ', config('cors.allowed_headers', ['Content-Type', 'Authorization', 'X-Requested-With'])));
                    if (config('cors.supports_credentials', false)) {
                        $response->headers->set('Access-Control-Allow-Credentials', 'true');
                    }
                }
                
                return $response;
            } elseif ($e instanceof \Illuminate\Auth\AuthenticationException) {
                $statusCode = 401;
            } elseif ($e instanceof \Illuminate\Authorization\AuthorizationException) {
                $statusCode = 403;
            } elseif ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
                $statusCode = 404;
            }
            
            // Get allowed origins from config
            $origin = $request->header('Origin');
            $allowedOrigins = config('cors.allowed_origins', []);
            $allowedPatterns = config('cors.allowed_origins_patterns', []);
            
            // Check if origin is allowed
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
            
            // Build response
            $response = response()->json([
                'message' => $e->getMessage() ?: 'Internal server error',
                'error' => config('app.debug') ? [
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                ] : null,
            ], $statusCode);
            
            // Add CORS headers if origin is allowed
            if ($isAllowed) {
                $response->headers->set('Access-Control-Allow-Origin', $origin);
                $response->headers->set('Access-Control-Allow-Methods', implode(', ', config('cors.allowed_methods', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])));
                $response->headers->set('Access-Control-Allow-Headers', implode(', ', config('cors.allowed_headers', ['Content-Type', 'Authorization', 'X-Requested-With'])));
                if (config('cors.supports_credentials', false)) {
                    $response->headers->set('Access-Control-Allow-Credentials', 'true');
                }
            }
            
            return $response;
        });
    })->create();
