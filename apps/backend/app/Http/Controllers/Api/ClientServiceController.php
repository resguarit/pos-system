<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientService;
use App\Models\ClientServicePayment;
use App\Models\Customer;
use App\Models\CashRegister;
use App\Models\CashMovement;
use App\Models\MovementType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log; // Added Log facade
use Carbon\Carbon;

class ClientServiceController extends Controller
{
    /**
     * Display a listing of the resource with customers and their services.
     */
    public function index(Request $request)
    {
        $query = ClientService::with(['customer.person', 'serviceType', 'lastPayment']);

        // Filter by customer
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->input('customer_id'));
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('customer.person', function ($q2) use ($search) {
                        $q2->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        // Pagination
        $perPage = $request->input('per_page', 15);
        $services = $query->orderBy('next_due_date')->paginate($perPage);

        return response()->json($services);
    }

    /**
     * Get customers with their services grouped for the status view
     */
    public function customersWithServices(Request $request)
    {
        $query = Customer::with([
            'person',
            'clientServices' => function ($q) {
                // Cargar TODOS los servicios del cliente para dar contexto completo
                // El filtro solo determina QUÉ CLIENTES mostrar, no qué servicios cargar
                $q->orderBy('status')->orderBy('next_due_date');
            },
            'clientServices.serviceType',
            'clientServices.lastPayment'
        ])->whereHas('clientServices')->orderBy('created_at', 'desc');

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('person', function ($q2) use ($search) {
                    $q2->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })
                    ->orWhereHas('clientServices', function ($q2) use ($search) {
                        $q2->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by service status
        if ($request->has('service_status')) {
            $status = $request->input('service_status');
            $query->whereHas('clientServices', function ($q) use ($status) {
                $q->where('status', $status);
            });
        }

        // Filter by payment status (expired/due soon/active)
        if ($request->has('payment_status')) {
            $paymentStatus = $request->input('payment_status');
            
            if ($paymentStatus === 'expired') {
                // Solo clientes con servicios vencidos
                $query->whereHas('clientServices', function ($q) {
                    $q->where('next_due_date', '<', now())
                        ->where('status', 'active');
                });
            } elseif ($paymentStatus === 'due_soon') {
                // Solo clientes con servicios por vencer (próximos 15 días)
                // Y que NO tengan servicios vencidos
                $query->whereHas('clientServices', function ($q) {
                    $q->whereBetween('next_due_date', [now(), now()->addDays(15)])
                        ->where('status', 'active');
                })->whereDoesntHave('clientServices', function ($q) {
                    // Excluir si tiene servicios vencidos
                    $q->where('next_due_date', '<', now())
                        ->where('status', 'active');
                });
            } elseif ($paymentStatus === 'active') {
                // Solo clientes al día (sin vencidos ni por vencer)
                $query->whereHas('clientServices', function ($q) {
                    $q->where('next_due_date', '>', now()->addDays(15))
                        ->where('status', 'active');
                })->whereDoesntHave('clientServices', function ($q) {
                    // Excluir si tiene servicios vencidos o por vencer
                    $q->where('next_due_date', '<=', now()->addDays(15))
                        ->where('status', 'active');
                });
            }
        }

        // Pagination
        $perPage = $request->input('per_page', 12);
        $customers = $query->paginate($perPage);

        return response()->json($customers);
    }

    /**
     * Get statistics
     */
    public function stats()
    {
        $stats = [
            'total_services' => ClientService::count(),
            'active_services' => ClientService::where('status', 'active')->count(),
            'suspended_services' => ClientService::where('status', 'suspended')->count(),
            'cancelled_services' => ClientService::where('status', 'cancelled')->count(),
            'expired_services' => ClientService::where('status', 'active')
                ->where('next_due_date', '<', now())
                ->count(),
            'due_soon_services' => ClientService::where('status', 'active')
                ->whereBetween('next_due_date', [now(), now()->addDays(15)])
                ->count(),
            'monthly_revenue' => ClientService::where('status', 'active')
                ->where('billing_cycle', 'monthly')
                ->sum('amount'),
            'annual_revenue_potential' => ClientService::where('status', 'active')
                ->get()
                ->sum(function ($service) {
                    switch ($service->billing_cycle) {
                        case 'monthly':
                            return $service->amount * 12;
                        case 'quarterly':
                            return $service->amount * 4;
                        case 'annual':
                            return $service->amount;
                        case 'biennial':
                            return $service->amount / 2;
                        default:
                            return 0;
                    }
                }),
        ];

        return response()->json($stats);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|exists:customers,id',
            'service_type_id' => 'nullable|exists:service_types,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
            'amount_without_iva' => 'nullable|numeric|min:0',
            'amount_with_iva' => 'nullable|numeric|min:0',
            'base_price' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_notes' => 'nullable|string|max:500',
            'billing_cycle' => 'required|in:monthly,quarterly,annual,biennial,one_time',
            'start_date' => 'required_without:next_due_date|date',
            'next_due_date' => 'nullable|date',
            'status' => 'required|in:active,suspended,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // Legacy compatibility: if the caller only sends `amount`, keep IVA fields in sync.
        if (!array_key_exists('amount_without_iva', $data) || $data['amount_without_iva'] === null) {
            $data['amount_without_iva'] = $data['amount'] ?? null;
        }
        if (!array_key_exists('amount_with_iva', $data) || $data['amount_with_iva'] === null) {
            $data['amount_with_iva'] = $data['amount'] ?? null;
        }

        if (!isset($data['start_date']) && isset($data['next_due_date'])) {
            $data['start_date'] = $this->calculateStartDateFromNextDueDate(
                Carbon::parse($data['next_due_date']),
                $data['billing_cycle']
            );
        }

        if (isset($data['start_date']) && isset($data['next_due_date'])) {
            $startDate = Carbon::parse($data['start_date']);
            $nextDueDate = Carbon::parse($data['next_due_date']);

            if ($nextDueDate->lt($startDate)) {
                return response()->json([
                    'errors' => ['next_due_date' => ['La fecha de vencimiento debe ser igual o posterior a la fecha de inicio.']]
                ], 422);
            }
        }

        if (!isset($data['next_due_date']) && $data['status'] === 'active') {
            $startDate = Carbon::parse($data['start_date']);
            $data['next_due_date'] = $this->calculateNextDueDate($startDate, $data['billing_cycle']);
        }

        $service = ClientService::create($data);

        return response()->json($service->load(['customer.person', 'serviceType']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(ClientService $clientService)
    {
        return response()->json($clientService->load(['customer.person', 'serviceType', 'payments', 'lastPayment']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ClientService $clientService)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'sometimes|required|exists:customers,id',
            'service_type_id' => 'nullable|exists:service_types,id',
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'sometimes|required|numeric|min:0',
            'amount_without_iva' => 'nullable|numeric|min:0',
            'amount_with_iva' => 'nullable|numeric|min:0',
            'base_price' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_notes' => 'nullable|string|max:500',
            'billing_cycle' => 'sometimes|required|in:monthly,quarterly,annual,biennial,one_time',
            'start_date' => 'sometimes|required|date',
            'next_due_date' => 'nullable|date',
            'status' => 'sometimes|required|in:active,suspended,cancelled',
            'next_billing_cycle' => 'nullable|in:monthly,quarterly,annual,biennial,one_time',
            'next_amount' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // Legacy compatibility: if the caller only updates `amount`, keep IVA fields in sync.
        if (array_key_exists('amount', $data)) {
            if (!array_key_exists('amount_without_iva', $data)) {
                $data['amount_without_iva'] = $data['amount'];
            }
            if (!array_key_exists('amount_with_iva', $data)) {
                $data['amount_with_iva'] = $data['amount'];
            }
        }

        // Apply all changes immediately
        // Clear any deferred changes when updating directly
        $data['next_billing_cycle'] = null;
        $data['next_amount'] = null;

        $clientService->update($data);

        return response()->json($clientService->load(['customer.person', 'serviceType', 'lastPayment']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ClientService $clientService)
    {
        $clientService->delete();

        return response()->json(['message' => 'Client service deleted successfully']);
    }

    /**
     * Renew a service (update next_due_date)
     */
    public function renew(Request $request, ClientService $clientService)
    {
        $validator = Validator::make($request->all(), [
            'payment_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $paymentDate = $request->input('payment_date') ? Carbon::parse($request->input('payment_date')) : now();

        $clientService->refresh();

        // Apply pending changes if they exist
        $billingCycle = $clientService->billing_cycle;
        $amount = $clientService->amount;
        $updates = [
            'status' => 'active',
        ];

        if ($clientService->next_billing_cycle) {
            $billingCycle = $clientService->next_billing_cycle;
            $updates['billing_cycle'] = $billingCycle;
            $updates['next_billing_cycle'] = null;
        }

        if ($clientService->next_amount !== null) {
            $amount = $clientService->next_amount;
            $updates['amount'] = $amount;
            $updates['next_amount'] = null;
        }

        // Use current next_due_date if it's in the future or today (to stack renewals), otherwise use payment date
        $baseDate = ($clientService->next_due_date && $clientService->next_due_date->endOfDay()->isAfter(now()) && $clientService->status === 'active')
            ? $clientService->next_due_date
            : $paymentDate;

        $nextDueDate = $this->calculateNextDueDate($baseDate, $billingCycle);
        $updates['next_due_date'] = $nextDueDate;

        $clientService->update($updates);

        return response()->json($clientService->load(['customer.person', 'serviceType']));
    }

    /**
     * Calculate next due date based on billing cycle
     */
    private function calculateNextDueDate(Carbon $fromDate, string $billingCycle): ?Carbon
    {
        switch ($billingCycle) {
            case 'monthly':
                return $fromDate->copy()->addMonth();
            case 'quarterly':
                return $fromDate->copy()->addMonths(3);
            case 'annual':
                return $fromDate->copy()->addYear();
            case 'biennial':
                return $fromDate->copy()->addYears(2);
            case 'one_time':
                return null;
            default:
                return $fromDate->copy();
        }
    }

    /**
     * Calculate start date based on next due date and billing cycle.
     */
    private function calculateStartDateFromNextDueDate(Carbon $nextDueDate, string $billingCycle): Carbon
    {
        switch ($billingCycle) {
            case 'monthly':
                return $nextDueDate->copy()->subMonth();
            case 'quarterly':
                return $nextDueDate->copy()->subMonths(3);
            case 'annual':
                return $nextDueDate->copy()->subYear();
            case 'biennial':
                return $nextDueDate->copy()->subYears(2);
            case 'one_time':
                return $nextDueDate->copy();
            default:
                return $nextDueDate->copy();
        }
    }

    /**
     * Store a payment for a specific client service.
     * Relates payment to the active cash register.
     */
    public function storePayment(Request $request, ClientService $clientService)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0', // Allows 0 for 100% discounted services
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:500',
            'renew_service' => 'boolean',
            'branch_id' => 'nullable|integer|exists:branches,id',
            'payment_method_id' => 'nullable|integer|exists:payment_methods,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = Auth::user();

        // Use branch_id from request if provided, otherwise use user's branch
        $branchId = $request->input('branch_id') ?? $user->branch_id ?? 1;

        // Verify there's an active cash register for the selected branch
        $cashRegister = CashRegister::where('branch_id', $branchId)
            ->where('status', 'open')
            ->latest()
            ->first();

        if (!$cashRegister) {
            return response()->json([
                'message' => 'No hay una caja abierta en la sucursal seleccionada. Debe abrir la caja antes de registrar pagos.',
                'error' => 'NO_OPEN_CASH_REGISTER'
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Determine Payment Method ID
            $paymentMethodId = $request->input('payment_method_id');
            if (!$paymentMethodId) {
                // Try to find default "Efectivo" method
                $defaultMethod = \App\Models\PaymentMethod::where('name', 'like', '%Efectivo%')
                    ->where('is_active', true)
                    ->first();
                $paymentMethodId = $defaultMethod ? $defaultMethod->id : null;
            }

            // Create the payment record
            $payment = ClientServicePayment::create([
                'client_service_id' => $clientService->id,
                'amount' => $request->input('amount'),
                'payment_date' => $request->input('payment_date'),
                'notes' => $request->input('notes'),
            ]);

            // Find or create movement type for service payments
            $movementType = MovementType::firstOrCreate(
                ['name' => 'Pago de servicio'],
                [
                    'operation_type' => 'entrada',
                    'affects_cash' => true,
                    'is_manual' => false,
                    'description' => 'Pago de servicios de clientes'
                ]
            );

            // Create cash movement
            CashMovement::create([
                'cash_register_id' => $cashRegister->id,
                'movement_type_id' => $movementType->id,
                'reference_type' => ClientServicePayment::class,
                'reference_id' => $payment->id,
                'amount' => $request->input('amount'),
                'description' => 'Pago de servicio: ' . $clientService->name . ' - Cliente: ' .
                    ($clientService->customer->person->first_name ?? '') . ' ' .
                    ($clientService->customer->person->last_name ?? ''),
                'user_id' => $user->id,
                'payment_method_id' => $paymentMethodId,
                'affects_balance' => true,
            ]);

            // Renew service if requested
            if ($request->input('renew_service', true)) {
                $paymentDate = Carbon::parse($request->input('payment_date'));

                // Reload the model to ensure we have the latest pending changes
                $clientService->refresh();

                Log::info('Processing Payment Renewal', [
                    'service_id' => $clientService->id,
                    'current_cycle' => $clientService->billing_cycle,
                    'next_billing_cycle' => $clientService->next_billing_cycle,
                    'next_amount' => $clientService->next_amount
                ]);

                // For one-time services, set next_due_date to null (fully paid)
                if ($clientService->billing_cycle === 'one_time') {
                    $clientService->update([
                        'next_due_date' => null,
                        'status' => 'active',
                    ]);
                } else {
                    // Apply pending changes if they exist during payment renewal
                    $billingCycle = $clientService->billing_cycle;
                    $amount = $clientService->amount;
                    $updates = ['status' => 'active'];

                    if ($clientService->next_billing_cycle) {
                        Log::info('Applying pending billing cycle', ['new_cycle' => $clientService->next_billing_cycle]);
                        $billingCycle = $clientService->next_billing_cycle;
                        $updates['billing_cycle'] = $billingCycle;
                        $updates['next_billing_cycle'] = null;
                    }

                    if ($clientService->next_amount !== null) {
                        $amount = $clientService->next_amount;
                        $updates['amount'] = $amount;
                        $updates['next_amount'] = null;
                    }

                    // Use current next_due_date if it's in the future or today (to stack renewals), otherwise use payment date
                    $baseDate = ($clientService->next_due_date && $clientService->next_due_date->endOfDay()->isAfter(now()) && $clientService->status === 'active')
                        ? $clientService->next_due_date
                        : $paymentDate;

                    $nextDueDate = $this->calculateNextDueDate($baseDate, $billingCycle);
                    $updates['next_due_date'] = $nextDueDate;

                    $clientService->update($updates);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Pago registrado exitosamente',
                'payment' => $payment,
                'service' => $clientService->fresh()->load(['customer.person', 'serviceType']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al registrar el pago',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Paginated list of service payments in a date range (reporting).
     */
    public function listPayments(Request $request)
    {
        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'include_expired_services' => ['nullable', 'in:0,1,true,false'],
        ]);

        $from = ! empty($validated['from_date'])
            ? Carbon::parse($validated['from_date'])->startOfDay()
            : Carbon::now()->startOfMonth()->startOfDay();

        $to = ! empty($validated['to_date'])
            ? Carbon::parse($validated['to_date'])->endOfDay()
            : Carbon::now()->endOfMonth()->endOfDay();

        if ($from->greaterThan($to)) {
            return response()->json([
                'message' => 'La fecha inicial debe ser anterior o igual a la fecha final.',
            ], 422);
        }

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);

        $query = ClientServicePayment::query()
            ->with(['service.customer.person'])
            ->whereDate('payment_date', '>=', $from->toDateString())
            ->whereDate('payment_date', '<=', $to->toDateString());

        $includeExpiredRaw = $request->input('include_expired_services', '0');
        $includeExpired = in_array((string) $includeExpiredRaw, ['1', 'true', 'TRUE'], true);

        if (! $includeExpired) {
            $today = Carbon::now()->toDateString();
            $query->whereHas('service', function ($q) use ($today) {
                $q->where('status', 'active')
                    ->whereNotNull('next_due_date')
                    ->whereDate('next_due_date', '>=', $today);
            });
        }

        if (! empty($validated['search'])) {
            $term = trim($validated['search']);
            $query->whereHas('service', function ($q) use ($term) {
                $q->where('name', 'like', '%'.$term.'%')
                    ->orWhereHas('customer.person', function ($q2) use ($term) {
                        $q2->where('first_name', 'like', '%'.$term.'%')
                            ->orWhere('last_name', 'like', '%'.$term.'%');
                    });
            });
        }

        $totalAmount = (float) (clone $query)->sum('amount');

        $paginator = $query
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->paginate($perPage);

        $data = $paginator->getCollection()->map(function (ClientServicePayment $payment) {
            $service = $payment->service;
            $person = $service?->customer?->person;

            return [
                'id' => $payment->id,
                'payment_date' => $payment->payment_date->format('Y-m-d'),
                'amount' => (string) $payment->amount,
                'notes' => $payment->notes,
                'client_service_id' => $payment->client_service_id,
                'service_name' => $service?->name,
                'billing_cycle' => $service?->billing_cycle,
                'customer_id' => $service?->customer_id,
                'customer_display_name' => $person
                    ? trim(($person->first_name ?? '').' '.($person->last_name ?? ''))
                    : null,
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'summary' => [
                'total_amount' => round($totalAmount, 2),
                'period_from' => $from->toDateString(),
                'period_to' => $to->toDateString(),
            ],
        ]);
    }

    /**
     * Report: services that are expiring soon or already expired.
     */
    public function expiring(Request $request)
    {
        $validated = $request->validate([
            'mode' => ['nullable', 'in:due_soon,expired'],
            'days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $mode = $validated['mode'] ?? 'due_soon';
        $days = (int) ($validated['days'] ?? 30);
        $perPage = min(max((int) $request->input('per_page', 10), 1), 100);

        $today = Carbon::now()->startOfDay();
        $end = $today->copy()->addDays($days)->endOfDay();

        $query = ClientService::query()
            ->with(['customer.person', 'serviceType', 'lastPayment'])
            ->where('status', 'active')
            ->whereNotNull('next_due_date');

        if ($mode === 'expired') {
            $query->whereDate('next_due_date', '<', $today->toDateString());
        } else {
            $query->whereDate('next_due_date', '>=', $today->toDateString())
                ->whereDate('next_due_date', '<=', $end->toDateString());
        }

        if (! empty($validated['search'])) {
            $term = trim($validated['search']);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', '%'.$term.'%')
                    ->orWhereHas('customer.person', function ($q2) use ($term) {
                        $q2->where('first_name', 'like', '%'.$term.'%')
                            ->orWhere('last_name', 'like', '%'.$term.'%')
                            ->orWhere('email', 'like', '%'.$term.'%');
                    });
            });
        }

        $paginator = $query
            ->orderBy('next_due_date', 'asc')
            ->orderBy('id', 'asc')
            ->paginate($perPage);

        $data = $paginator->getCollection()->map(function (ClientService $service) {
            $person = $service->customer?->person;
            return [
                'id' => $service->id,
                'customer_id' => $service->customer_id,
                'customer_display_name' => $person ? trim(($person->first_name ?? '').' '.($person->last_name ?? '')) : null,
                'service_name' => $service->name,
                'billing_cycle' => $service->billing_cycle,
                'next_due_date' => $service->next_due_date?->format('Y-m-d'),
                'amount' => (string) $service->amount,
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'summary' => [
                'mode' => $mode,
                'days' => $mode === 'due_soon' ? $days : null,
            ],
        ]);
    }

    /**
     * Get payments for a specific client service.
     */
    public function getPayments(ClientService $clientService)
    {
        $payments = $clientService->payments()
            ->orderByDesc('payment_date')
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'amount' => $payment->amount,
                    'payment_date' => $payment->payment_date,
                    'notes' => $payment->notes,
                ];
            });

        return response()->json($payments);
    }
}
