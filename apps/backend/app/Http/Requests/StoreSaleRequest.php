<?php

namespace App\Http\Requests;

use App\Rules\CashRegisterMustBeOpen;
use App\Services\CashRegisterService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreSaleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $cashRegisterService = app(CashRegisterService::class);
        $branchId = $this->user()->branch_id ?? $this->input('branch_id') ?? 1;

        return [
            'customer_id' => 'required|exists:customers,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'branch_id' => [
                'required',
                'exists:branches,id',
                new CashRegisterMustBeOpen($cashRegisterService, $branchId)
            ],
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'subtotal' => 'required|numeric|min:0',
            'total_discount' => 'nullable|numeric|min:0',
            'total_tax' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'is_credit_sale' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'customer_id.required' => 'El cliente es obligatorio.',
            'customer_id.exists' => 'El cliente seleccionado no existe.',
            'payment_method_id.required' => 'El método de pago es obligatorio.',
            'payment_method_id.exists' => 'El método de pago seleccionado no existe.',
            'branch_id.required' => 'La sucursal es obligatoria.',
            'branch_id.exists' => 'La sucursal seleccionada no existe.',
            'items.required' => 'Debe agregar al menos un producto a la venta.',
            'items.min' => 'Debe agregar al menos un producto a la venta.',
            'items.*.product_id.required' => 'El producto es obligatorio.',
            'items.*.product_id.exists' => 'El producto seleccionado no existe.',
            'items.*.quantity.required' => 'La cantidad es obligatoria.',
            'items.*.quantity.min' => 'La cantidad debe ser mayor a 0.',
            'items.*.unit_price.required' => 'El precio unitario es obligatorio.',
            'items.*.unit_price.min' => 'El precio unitario debe ser mayor o igual a 0.',
            'items.*.discount_percentage.max' => 'El descuento no puede ser mayor al 100%.',
            'subtotal.required' => 'El subtotal es obligatorio.',
            'total_amount.required' => 'El total es obligatorio.',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422)
        );
    }

    /**
     * Get additional data after validation passes.
     */
    public function validated($key = null, $default = null)
    {
        $validated = parent::validated($key, $default);
        
        // Agregar información de la caja abierta
        $cashRegisterService = app(CashRegisterService::class);
        $branchId = $this->user()->branch_id ?? $this->input('branch_id') ?? 1;
        
        try {
            $currentCashRegister = $cashRegisterService->getCurrentCashRegister($branchId);
            $validated['current_cash_register_id'] = $currentCashRegister->id;
        } catch (\Exception $e) {
            // Ya fue validado en las reglas, pero por seguridad
        }

        return $validated;
    }
}
