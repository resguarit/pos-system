<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BranchController;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;

Route::get('/', function () {
    return view('welcome');
});

// Ruta para servir archivos de storage públicamente (fallback para symlink)
// Esto es útil para logos y favicons guardados en storage
Route::get('/storage/{path}', function ($path) {
    try {
        $filePath = storage_path('app/public/' . $path);
        
        if (!file_exists($filePath)) {
            abort(404);
        }
        
        // Verificar que el archivo esté dentro de storage/app/public para seguridad
        $storagePath = storage_path('app/public');
        $realStoragePath = realpath($storagePath);
        $realFilePath = realpath($filePath);
        
        if ($realFilePath === false || strpos($realFilePath, $realStoragePath) !== 0) {
            abort(403, 'Acceso denegado');
        }
        
        $file = file_get_contents($filePath);
        $mimeType = mime_content_type($filePath);
        
        return Response::make($file, 200, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=31536000',
        ]);
    } catch (\Exception $e) {
        abort(404);
    }
})->where('path', '.*');

// Route::resource('branches', BranchController::class);
