<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class ConflictException extends Exception
{
    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'CONFLICT',
                'message' => $this->getMessage() ?: 'Resource conflict'
            ]
        ], 409);
    }
}
