<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

trait JsonResponseTrait
{
    /**
     * Return a successful JSON response.
     */
    protected function successResponse(
        mixed $data = null,
        string $message = 'Operación exitosa',
        int $statusCode = Response::HTTP_OK,
        array $additionalData = []
    ): JsonResponse {
        $response = [
            'message' => $message,
            'success' => true,
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        if (!empty($additionalData)) {
            $response = array_merge($response, $additionalData);
        }

        return response()->json($response, $statusCode);
    }

    /**
     * Return an error JSON response.
     */
    protected function errorResponse(
        string $message = 'Error interno del servidor',
        int $statusCode = Response::HTTP_INTERNAL_SERVER_ERROR,
        mixed $error = null,
        array $additionalData = []
    ): JsonResponse {
        $response = [
            'message' => $message,
            'success' => false,
        ];

        if ($error !== null) {
            $response['error'] = $error;
        }

        if (!empty($additionalData)) {
            $response = array_merge($response, $additionalData);
        }

        return response()->json($response, $statusCode);
    }

    /**
     * Return a paginated JSON response.
     */
    protected function paginatedResponse(
        LengthAwarePaginator $paginator,
        string $message = 'Datos obtenidos exitosamente',
        array $additionalData = []
    ): JsonResponse {
        $response = [
            'message' => $message,
            'success' => true,
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];

        if (!empty($additionalData)) {
            $response = array_merge($response, $additionalData);
        }

        return response()->json($response);
    }

    /**
     * Return a collection JSON response.
     */
    protected function collectionResponse(
        Collection $collection,
        string $message = 'Datos obtenidos exitosamente',
        array $additionalData = []
    ): JsonResponse {
        $response = [
            'message' => $message,
            'success' => true,
            'data' => $collection,
        ];

        if (!empty($additionalData)) {
            $response = array_merge($response, $additionalData);
        }

        return response()->json($response);
    }

    /**
     * Return a not found JSON response.
     */
    protected function notFoundResponse(string $message = 'Recurso no encontrado'): JsonResponse
    {
        return $this->errorResponse($message, Response::HTTP_NOT_FOUND);
    }

    /**
     * Return a validation error JSON response.
     */
    protected function validationErrorResponse(
        array $errors,
        string $message = 'Error de validación'
    ): JsonResponse {
        return $this->errorResponse($message, Response::HTTP_UNPROCESSABLE_ENTITY, $errors);
    }

    /**
     * Return a created JSON response.
     */
    protected function createdResponse(
        mixed $data,
        string $message = 'Recurso creado exitosamente'
    ): JsonResponse {
        return $this->successResponse($data, $message, Response::HTTP_CREATED);
    }

    /**
     * Return an updated JSON response.
     */
    protected function updatedResponse(
        mixed $data,
        string $message = 'Recurso actualizado exitosamente'
    ): JsonResponse {
        return $this->successResponse($data, $message);
    }

    /**
     * Return a deleted JSON response.
     */
    protected function deletedResponse(string $message = 'Recurso eliminado exitosamente'): JsonResponse
    {
        return $this->successResponse(null, $message);
    }

    /**
     * Handle exceptions and return appropriate error response.
     */
    protected function handleException(\Exception $e, string $defaultMessage = 'Error interno del servidor'): JsonResponse
    {
        $message = $e->getMessage() ?: $defaultMessage;
        $statusCode = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : Response::HTTP_INTERNAL_SERVER_ERROR;
        
        return $this->errorResponse($message, $statusCode, $e->getMessage());
    }
}



