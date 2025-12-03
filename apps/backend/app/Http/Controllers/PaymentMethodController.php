<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;

class PaymentMethodController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PaymentMethod::query();

        if (!$request->has('all')) {
            $query->where('is_active', true);
        }

        $paymentMethods = $query->get();
        return response()->json(['data' => $paymentMethods], 200);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:payment_methods,name',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'affects_cash' => 'sometimes|boolean',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $paymentMethod = PaymentMethod::create($validator->validated());
        return response()->json(['data' => $paymentMethod, 'message' => 'Método de pago creado exitosamente.'], 201);
    }


    /**
     * Display the specified resource.
     */
    public function show(int $id): JsonResponse
    {
        $paymentMethod = PaymentMethod::find($id);
        if (!$paymentMethod) {
            return response()->json(['message' => 'Método de pago no encontrado.'], 404);
        }
        return response()->json(['data' => $paymentMethod], 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $paymentMethod = PaymentMethod::find($id);
        if (!$paymentMethod) {
            return response()->json(['message' => 'Método de pago no encontrado.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:payment_methods,name,' . $id,
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'affects_cash' => 'sometimes|boolean',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $paymentMethod->update($validator->validated());
        return response()->json(['data' => $paymentMethod->fresh(), 'message' => 'Método de pago actualizado exitosamente.'], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        $paymentMethod = PaymentMethod::find($id);
        if (!$paymentMethod) {
            return response()->json(['message' => 'Método de pago no encontrado.'], 404);
        }

        $paymentMethod->delete();
        return response()->json(['message' => 'Método de pago eliminado exitosamente.'], 200);
    }
}
