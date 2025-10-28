<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class PermissionDeniedException extends Exception
{
    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'PERMISSION_DENIED',
                'message' => $this->getMessage() ?: 'Permission denied'
            ]
        ], 403);
    }
}
