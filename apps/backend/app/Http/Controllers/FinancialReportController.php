<?php

namespace App\Http\Controllers;

use App\Services\FinancialReportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FinancialReportController extends Controller
{
    protected FinancialReportService $financialReportService;

    public function __construct(FinancialReportService $financialReportService)
    {
        $this->financialReportService = $financialReportService;
    }

    /**
     * Obtener resumen financiero (ingresos - egresos)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getSummary(Request $request): JsonResponse
    {
        try {
            $summary = $this->financialReportService->getFinancialSummary($request);
            
            return response()->json([
                'message' => 'Resumen financiero obtenido exitosamente',
                'data' => $summary
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al obtener el resumen financiero: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener desglose detallado de movimientos de entrada y salida
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getMovementsDetail(Request $request): JsonResponse
    {
        try {
            $detail = $this->financialReportService->getMovementsDetail($request);
            
            return response()->json([
                'message' => 'Desglose de movimientos obtenido exitosamente',
                'data' => $detail
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al obtener el desglose de movimientos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener desglose diario del resumen financiero
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getDailyBreakdown(Request $request): JsonResponse
    {
        try {
            $breakdown = $this->financialReportService->getDailyBreakdown($request);
            
            return response()->json([
                'message' => 'Desglose diario obtenido exitosamente',
                'data' => $breakdown
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al obtener el desglose diario: ' . $e->getMessage()
            ], 500);
        }
    }
}

