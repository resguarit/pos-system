<?php

namespace App\Http\Controllers;

use App\Interfaces\CustomerServiceInterface;
use App\Exceptions\ConflictException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use App\Models\SaleHeader; // Added import

class CustomerController extends Controller
{
    protected $customerService;

    public function __construct(CustomerServiceInterface $customerService)
    {
        $this->customerService = $customerService;
    }

    public function index(Request $request): JsonResponse
    {
        // Si hay búsqueda, filtrar clientes
        if ($request->has('search')) {
            $searchTerm = $request->get('search');
            $customers = $this->customerService->searchCustomers($searchTerm);
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Clientes encontrados',
                'data' => $customers
            ], 200);
        }
        
        // Si no hay búsqueda, devolver todos los clientes
        $customers = $this->customerService->getAllCustomers();
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Clientes obtenidos correctamente',
            'data' => $customers
        ], 200);
    }

    public function show($id): JsonResponse
    {
        $customer = $this->customerService->getCustomerById($id);
        if (!$customer) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Cliente no encontrado'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Cliente obtenido correctamente',
            'data' => $customer
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // Normalizar campos opcionales
        $request->merge([
            'email' => $request->filled('email') && trim($request->input('email')) !== '' ? trim($request->input('email')) : null,
            'credit_limit' => $request->filled('credit_limit') && trim((string)$request->input('credit_limit')) !== '' ? $request->input('credit_limit') : null,
        ]);

        $validatedData = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'documento' => 'nullable|digits_between:6,12',
            'cuit' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'fiscal_condition_id' => 'nullable|integer',
            'person_type_id' => 'nullable|integer',
            'email' => 'nullable|email|max:255',
            'active' => 'boolean',
            'credit_limit' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'document_type_id' => 'nullable|integer',
        ]);
        $validatedData['active'] = $request->input('active', true);

        $customer = $this->customerService->createCustomer($validatedData);
        return response()->json([
            'status' => 201,
            'success' => true,
            'message' => 'Cliente creado correctamente',
            'data' => $customer
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        // Normalizar campos opcionales: convertir strings vacíos a null
        $request->merge([
            'email' => $request->filled('email') && trim($request->input('email')) !== '' ? trim($request->input('email')) : null,
            'documento' => $request->filled('documento') && trim((string)$request->input('documento')) !== '' ? trim((string)$request->input('documento')) : null,
            'credit_limit' => $request->filled('credit_limit') && trim((string)$request->input('credit_limit')) !== '' ? $request->input('credit_limit') : null,
        ]);

        $validatedData = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'documento' => 'nullable|digits_between:6,12',
            'cuit' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'fiscal_condition_id' => 'nullable|integer',
            'person_type_id' => 'nullable|integer',
            'email' => 'nullable|email|max:255',
            'active' => 'boolean',
            'credit_limit' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'document_type_id' => 'nullable|integer',
        ]);

        $customer = $this->customerService->updateCustomer($id, $validatedData);
        if (!$customer) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Cliente no encontrado'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Cliente actualizado correctamente',
            'data' => $customer
        ], 200);
    }

    public function destroy($id): JsonResponse
    {
        try {
            $result = $this->customerService->deleteCustomer($id);
            if (!$result) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ], 404);
            }
            return response()->json([
                'status' => 204,
                'success' => true,
                'message' => 'Cliente eliminado correctamente'
            ], 204);
        } catch (ConflictException $e) {
            return response()->json([
                'status' => 409,
                'success' => false,
                'message' => $e->getMessage()
            ], 409);
        } catch (\Exception $e) {
            Log::error('Error al eliminar cliente: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al eliminar el cliente: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCustomerSales(Request $request, $id): JsonResponse
    {
        $customer = $this->customerService->getCustomerById($id);
        if (!$customer) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Cliente no encontrado'
            ], 404);
        }

        $sales = SaleHeader::with(['items.product', 'branch', 'paymentType', 'receiptType']) // Added 'receiptType'
                            ->where('customer_id', $id)
                            ->orderBy('date', 'desc')
                            ->get();

        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Ventas del cliente obtenidas correctamente',
            'data' => $sales
        ], 200);
    }

    public function getCustomerSalesWithSummary(Request $request, $id): JsonResponse
    {
        $customer = $this->customerService->getCustomerById($id);
        if (!$customer) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Cliente no encontrado'
            ], 404);
        }

        // Leer parámetros de fecha
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');

        $salesQuery = SaleHeader::with(['items.product', 'branch', 'paymentType', 'receiptType'])
            ->where('customer_id', $id);

        if ($fromDate) {
            $salesQuery->whereDate('date', '>=', $fromDate);
        }
        if ($toDate) {
            $salesQuery->whereDate('date', '<=', $toDate);
        }

        $sales = $salesQuery->orderBy('date', 'desc')->get();

        $summary = $this->customerService->getCustomerSalesSummary($id, $fromDate, $toDate);

        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Ventas y resumen del cliente obtenidas correctamente',
            'data' => $sales,
            'sales_count' => $summary['sales_count'],
            'grand_total_amount' => $summary['grand_total_amount'],
            'grand_total_iva' => $summary['grand_total_iva'],
            'average_sale_amount' => $summary['average_sale_amount'],
        ], 200);
    }

    public function checkName($firstName, $lastName): JsonResponse
    {
        try {
            $exists = $this->customerService->checkNameExists($firstName, $lastName);
            
            return response()->json([
                'exists' => $exists
            ]);
        } catch (\Exception $e) {
            \Log::error('Error checking customer name: ' . $e->getMessage());
            return response()->json([
                'exists' => false
            ], 500);
        }
    }

    public function getCurrentAccountBalance($id): JsonResponse
    {
        try {
            $customer = $this->customerService->getCustomerById($id);
            if (!$customer) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ], 404);
            }

            // Calcular el saldo real basado en el atributo pending_amount
            $sales = \App\Models\SaleHeader::where('customer_id', $id)
                ->whereNull('deleted_at')
                ->get();

            $totalDebt = 0;
            foreach ($sales as $sale) {
                $pending = $sale->pending_amount;
                if ($pending > 0) {
                    $totalDebt += $pending;
                }
            }

            $balance = round($totalDebt, 2);

            return response()->json([
                'status' => 200,
                'success' => true,
                'balance' => $balance,
                'has_pending_sales' => $balance > 0,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error al obtener saldo de cuenta corriente: ' . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener el saldo',
                'balance' => 0.0,
            ], 500);
        }
    }
}
