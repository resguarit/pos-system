<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientService;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ClientServiceController extends Controller
{
    /**
     * Display a listing of the resource with customers and their services.
     */
    public function index(Request $request)
    {
        $query = ClientService::with(['customer.person', 'serviceType']);

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
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhereHas('customer.person', function($q2) use ($search) {
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
            'clientServices' => function($q) {
                $q->orderBy('status')->orderBy('next_due_date');
            },
            'clientServices.serviceType'
        ])->whereHas('clientServices');

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->whereHas('person', function($q2) use ($search) {
                    $q2->where('first_name', 'like', "%{$search}%")
                       ->orWhere('last_name', 'like', "%{$search}%")
                       ->orWhere('email', 'like', "%{$search}%");
                })
                ->orWhereHas('clientServices', function($q2) use ($search) {
                    $q2->where('name', 'like', "%{$search}%");
                });
            });
        }

        // Filter by service status
        if ($request->has('service_status')) {
            $status = $request->input('service_status');
            $query->whereHas('clientServices', function($q) use ($status) {
                $q->where('status', $status);
            });
        }

        // Filter by payment status (expired/due soon/active)
        if ($request->has('payment_status')) {
            $paymentStatus = $request->input('payment_status');
            $query->whereHas('clientServices', function($q) use ($paymentStatus) {
                if ($paymentStatus === 'expired') {
                    $q->where('next_due_date', '<', now())
                      ->where('status', 'active');
                } elseif ($paymentStatus === 'due_soon') {
                    $q->whereBetween('next_due_date', [now(), now()->addDays(30)])
                      ->where('status', 'active');
                } elseif ($paymentStatus === 'active') {
                    $q->where('next_due_date', '>', now()->addDays(30))
                      ->where('status', 'active');
                }
            });
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
                ->whereBetween('next_due_date', [now(), now()->addDays(30)])
                ->count(),
            'monthly_revenue' => ClientService::where('status', 'active')
                ->where('billing_cycle', 'monthly')
                ->sum('amount'),
            'annual_revenue_potential' => ClientService::where('status', 'active')
                ->get()
                ->sum(function($service) {
                    switch($service->billing_cycle) {
                        case 'monthly': return $service->amount * 12;
                        case 'quarterly': return $service->amount * 4;
                        case 'annual': return $service->amount;
                        default: return 0;
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
            'billing_cycle' => 'required|in:monthly,quarterly,annual,one_time',
            'start_date' => 'required|date',
            'next_due_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|in:active,suspended,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // Auto-calculate next_due_date if not provided
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
        return response()->json($clientService->load(['customer.person', 'serviceType', 'payments']));
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
            'billing_cycle' => 'sometimes|required|in:monthly,quarterly,annual,one_time',
            'start_date' => 'sometimes|required|date',
            'next_due_date' => 'nullable|date',
            'status' => 'sometimes|required|in:active,suspended,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $clientService->update($validator->validated());

        return response()->json($clientService->load(['customer.person', 'serviceType']));
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
        $nextDueDate = $this->calculateNextDueDate($paymentDate, $clientService->billing_cycle);

        $clientService->update([
            'next_due_date' => $nextDueDate,
            'status' => 'active',
        ]);

        return response()->json($clientService->load(['customer.person', 'serviceType']));
    }

    /**
     * Calculate next due date based on billing cycle
     */
    private function calculateNextDueDate(Carbon $fromDate, string $billingCycle): Carbon
    {
        switch ($billingCycle) {
            case 'monthly':
                return $fromDate->copy()->addMonth();
            case 'quarterly':
                return $fromDate->copy()->addMonths(3);
            case 'annual':
                return $fromDate->copy()->addYear();
            default:
                return $fromDate->copy();
        }
    }

    /**
     * Get payments for a specific client service.
     */
    public function getPayments(ClientService $clientService)
    {
        $payments = $clientService->payments()
            ->orderByDesc('payment_date')
            ->get()
            ->map(function($payment) {
                return [
                    'id' => $payment->id,
                    'amount' => $payment->amount,
                    'payment_date' => $payment->payment_date,
                    'notes' => $payment->notes,
                ];
            });

        return response()->json($payments);
    }
