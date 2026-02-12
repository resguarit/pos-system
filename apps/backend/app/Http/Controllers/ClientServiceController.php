<?php

namespace App\Http\Controllers;

use App\Models\ClientService;
use App\Models\Customer;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ClientServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = ClientService::with('customer.person');

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('status') && $request->status !== 'todos') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('customer.person', function ($q2) use ($search) {
                        $q2->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
                    });
            });
        }

        if ($request->filled('due_status')) {
            $now = Carbon::now();
            if ($request->due_status === 'vencidos') {
                $query->where('next_due_date', '<', $now)->where('status', 'active');
            } elseif ($request->due_status === 'por-vencer') {
                $query->whereBetween('next_due_date', [$now, $now->copy()->addDays(30)])->where('status', 'active');
            }
        }

        return response()->json($query->orderBy('next_due_date')->paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
            'billing_cycle' => 'required|in:monthly,annual,one_time',
            'start_date' => 'required_without:next_due_date|date',
            'next_due_date' => 'nullable|date',
            'status' => 'in:active,suspended,cancelled',
        ]);

        if (!isset($validated['start_date']) && isset($validated['next_due_date'])) {
            $validated['start_date'] = $this->calculateStartDateFromNextDueDate(
                Carbon::parse($validated['next_due_date']),
                $validated['billing_cycle']
            );
        }

        if (isset($validated['start_date']) && isset($validated['next_due_date'])) {
            $startDate = Carbon::parse($validated['start_date']);
            $nextDueDate = Carbon::parse($validated['next_due_date']);

            if ($nextDueDate->lt($startDate)) {
                return response()->json([
                    'errors' => ['next_due_date' => ['La fecha de vencimiento debe ser igual o posterior a la fecha de inicio.']]
                ], 422);
            }
        }

        // Calculate initial next_due_date if not provided
        if (!isset($request->next_due_date)) {
            $startDate = Carbon::parse($validated['start_date']);
            if ($validated['billing_cycle'] === 'monthly') {
                $validated['next_due_date'] = $startDate->copy()->addMonth();
            } elseif ($validated['billing_cycle'] === 'annual') {
                $validated['next_due_date'] = $startDate->copy()->addYear();
            } else {
                $validated['next_due_date'] = null;
            }
        }

        $service = ClientService::create($validated);

        return response()->json($service, 201);
    }

    public function show($id)
    {
        return ClientService::with('customer.person')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $service = ClientService::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'sometimes|numeric|min:0',
            'billing_cycle' => 'sometimes|in:monthly,annual,one_time',
            'start_date' => 'sometimes|date',
            'next_due_date' => 'nullable|date',
            'status' => 'sometimes|in:active,suspended,cancelled',
        ]);

        $service->update($validated);

        return response()->json($service);
    }

    public function destroy($id)
    {
        $service = ClientService::findOrFail($id);
        $service->delete();

        return response()->json(['message' => 'Service deleted successfully']);
    }

    // Helper to renew service (advance due date)
    public function renew(Request $request, $id)
    {
        $service = ClientService::findOrFail($id);

        if ($service->billing_cycle === 'one_time') {
            return response()->json(['message' => 'One time services cannot be renewed'], 400);
        }

        $currentDueDate = $service->next_due_date ? Carbon::parse($service->next_due_date) : Carbon::now();

        if ($service->billing_cycle === 'monthly') {
            $newDueDate = $currentDueDate->copy()->addMonth();
        } else {
            $newDueDate = $currentDueDate->copy()->addYear();
        }

        // Create Payment Record
        \App\Models\ClientServicePayment::create([
            'client_service_id' => $service->id,
            'amount' => $request->input('amount', $service->amount), // Allow overriding amount
            'payment_date' => Carbon::now(),
            'notes' => 'Renovación automática - Nuevo vencimiento: ' . $newDueDate->format('Y-m-d')
        ]);

        $service->update(['next_due_date' => $newDueDate]);

        return response()->json($service);
    }

    public function payments($id)
    {
        $service = ClientService::findOrFail($id);
        return response()->json($service->payments()->orderBy('payment_date', 'desc')->get());
    }

    public function stats()
    {
        $now = Carbon::now();
        $thirtyDaysFromNow = $now->copy()->addDays(30);

        $total = ClientService::count();
        $active = ClientService::where('status', 'active')->count();
        $suspended = ClientService::where('status', 'suspended')->count();
        $cancelled = ClientService::where('status', 'cancelled')->count();

        $expired = ClientService::where('status', 'active')
            ->whereNotNull('next_due_date')
            ->where('next_due_date', '<', $now)
            ->count();

        $dueSoon = ClientService::where('status', 'active')
            ->whereNotNull('next_due_date')
            ->whereBetween('next_due_date', [$now, $thirtyDaysFromNow])
            ->count();

        $monthlyRevenue = ClientService::where('status', 'active')
            ->where('billing_cycle', 'monthly')
            ->sum('amount');

        $annualRevenue = ClientService::where('status', 'active')
            ->where('billing_cycle', 'annual')
            ->sum('amount');

        return response()->json([
            'total' => $total,
            'active' => $active,
            'suspended' => $suspended,
            'cancelled' => $cancelled,
            'expired' => $expired,
            'due_soon' => $dueSoon,
            'monthly_revenue' => $monthlyRevenue,
            'annual_revenue' => $annualRevenue,
        ]);
    }

    private function calculateStartDateFromNextDueDate(Carbon $nextDueDate, string $billingCycle): Carbon
    {
        switch ($billingCycle) {
            case 'monthly':
                return $nextDueDate->copy()->subMonth();
            case 'annual':
                return $nextDueDate->copy()->subYear();
            case 'one_time':
                return $nextDueDate->copy();
            default:
                return $nextDueDate->copy();
        }
    }
}
