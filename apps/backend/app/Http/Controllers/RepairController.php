<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Interfaces\RepairServiceInterface;
use App\Http\Resources\RepairResource;
use App\Http\Resources\RepairNoteResource;
use App\Http\Requests\Repairs\StoreRepairRequest;
use App\Http\Requests\Repairs\UpdateRepairRequest;
use Barryvdh\DomPDF\Facade\Pdf;

class RepairController extends Controller
{
    public function __construct(private RepairServiceInterface $repairs)
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * List repairs with filtering, sorting and pagination
     */
    public function index(Request $request): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        $data = $this->repairs->list($request->all());
        return RepairResource::collection($data);
    }

    /**
     * Get a single repair with all relations
     */
    public function show(int $id): RepairResource|JsonResponse
    {
        $repair = $this->repairs->find($id);
        if (!$repair) {
            return response()->json(['message' => 'Reparación no encontrada'], 404);
        }
        return new RepairResource($repair);
    }

    /**
     * Create a new repair
     */
    public function store(StoreRepairRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['user_id'] = $request->user()->id;

        $repair = $this->repairs->create($validated);

        return (new RepairResource($repair))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update an existing repair
     */
    public function update(UpdateRepairRequest $request, int $id): RepairResource|JsonResponse
    {
        $repair = $this->repairs->find($id);
        if (!$repair) {
            return response()->json(['message' => 'Reparación no encontrada'], 404);
        }

        $repair = $this->repairs->update($id, $request->validated());
        return new RepairResource($repair);
    }

    /**
     * Update only the status of a repair
     */
    public function updateStatus(Request $request, int $id): RepairResource|JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:Pendiente de recepción,Recibido,En diagnóstico,Reparación Interna,Reparación Externa,Esperando repuestos,Terminado,Entregado,Cancelado',
        ]);

        $repair = $this->repairs->find($id);
        if (!$repair) {
            return response()->json(['message' => 'Reparación no encontrada'], 404);
        }

        $repair = $this->repairs->updateStatus($id, $validated['status']);
        return new RepairResource($repair);
    }

    /**
     * Assign a technician to a repair
     */
    public function assign(Request $request, int $id): RepairResource|JsonResponse
    {
        $validated = $request->validate([
            'technician_id' => 'required|integer|exists:users,id',
        ]);

        $repair = $this->repairs->find($id);
        if (!$repair) {
            return response()->json(['message' => 'Reparación no encontrada'], 404);
        }

        $repair = $this->repairs->assignTechnician($id, $validated['technician_id']);
        return new RepairResource($repair);
    }

    /**
     * Add a note to a repair
     */
    public function addNote(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'note' => 'required|string|max:2000',
        ]);

        $repair = $this->repairs->find($id);
        if (!$repair) {
            return response()->json(['message' => 'Reparación no encontrada'], 404);
        }

        $this->repairs->addNote($id, $request->user()->id, $validated['note']);
        return response()->json(['message' => 'Nota agregada']);
    }

    /**
     * Get repair statistics
     */
    public function stats(Request $request): JsonResponse
    {
        $stats = $this->repairs->stats($request->all());
        return response()->json($stats);
    }

    /**
     * Get available options for status and priority
     */
    public function options(): JsonResponse
    {
        $insurers = \App\Models\Insurer::query()
            ->where('active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'statuses' => ['Pendiente de recepción', 'Recibido', 'En diagnóstico', 'Reparación Interna', 'Reparación Externa', 'Esperando repuestos', 'Terminado', 'Entregado', 'Cancelado'],
            'priorities' => ['Alta', 'Media', 'Baja'],
            'insurers' => $insurers,
        ]);
    }

    /**
     * Generate intake receipt PDF
     */
    public function generatePdf(int $id): \Illuminate\Http\Response|JsonResponse
    {
        $repair = $this->repairs->find($id);
        if (!$repair) {
            return response()->json(['message' => 'Reparación no encontrada'], 404);
        }

        $date = now();
        $date->setLocale('es');
        $pdf = Pdf::loadView('pdf.repair-intake', [
            'repair' => $repair,
            'date' => $date->translatedFormat('d/m/Y H:i'),
        ]);

        $filename = "comprobante_reparacion_{$repair->code}.pdf";

        return $pdf->download($filename);
    }

    /**
     * Generate insurance reception certificate PDF
     */
    public function receptionCertificate(int $id): \Illuminate\Http\Response|JsonResponse
    {
        $repair = $this->repairs->find($id);
        if (!$repair) {
            return response()->json(['message' => 'Reparación no encontrada'], 404);
        }

        // Ensure insurer specific data is loaded or available
        // If not siniestro, maybe we shouldn't generate this? Or allow it anyway?
        // User said: "cuando tengo una nueva reparacion de aseguradora"
        // But likely we can just generate it if requested.

        $date = now();
        $date->setLocale('es');
        $insured = $repair->insuredCustomer ?? $repair->customer;

        $pdf = Pdf::loadView('pdf.reception-certificate', [
            'repair' => $repair,
            'date' => $date,
            'day' => $date->format('d'),
            'monthName' => $date->translatedFormat('F'),
            'year' => $date->format('Y'),
            'insurerName' => $repair->insurer ? $repair->insurer->name : ($repair->insurer_name ?? 'Aseguradora no especificada'),
            'name' => $insured->full_name ?? ($insured->person ? $insured->person->full_name : 'No especificado'),
            'phone' => $insured->person->phone ?? ($repair->customer->person->phone ?? '-'),
            'email' => $insured->email ?? ($repair->customer->email ?? '-'),
            'address' => $insured->person->address ?? ($repair->customer->person->address ?? '-'),
        ]);

        $filename = "acta_recepcion_siniestro_{$repair->code}.pdf";

        return $pdf->download($filename);
    }

    /**
     * Mark a repair as no repair and store optional reason
     */
    public function markNoRepair(Request $request, int $id): RepairResource|JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:2000',
        ]);

        $repair = $this->repairs->find($id);
        if (!$repair) {
            return response()->json(['message' => 'Reparación no encontrada'], 404);
        }

        $repair = $this->repairs->markNoRepair($id, $validated['reason'] ?? null);
        return new RepairResource($repair);
    }

    /**
     * Generate no-repair certificate PDF
     */
    public function noRepairCertificate(int $id): \Illuminate\Http\Response|JsonResponse
    {
        $repair = $this->repairs->find($id);
        if (!$repair) {
            return response()->json(['message' => 'Reparación no encontrada'], 404);
        }

        $date = now();
        $date->setLocale('es');
        $pdf = Pdf::loadView('pdf.no-repair-certificate', [
            'repair' => $repair,
            'date' => $date,
            'day' => $date->format('d'),
            'monthName' => $date->translatedFormat('F'),
            'year' => $date->format('Y'),
            'reason' => $repair->no_repair_reason,
        ]);

        $filename = "acta_sin_reparacion_{$repair->code}.pdf";

        return $pdf->download($filename);
    }

    /**
     * Get all repairs grouped by status (for Kanban view)
     */
    public function kanban(Request $request): JsonResponse
    {
        $repairs = $this->repairs->listAll($request->all());

        $grouped = [
            'Pendiente de recepción' => [],
            'Recibido' => [],
            'En diagnóstico' => [],
            'Reparación Interna' => [],
            'Reparación Externa' => [],
            'Esperando repuestos' => [],
            'Terminado' => [],
            'Entregado' => [],
            'Cancelado' => [],
        ];

        foreach ($repairs as $repair) {
            $status = $repair->status;
            if (isset($grouped[$status])) {
                $grouped[$status][] = new RepairResource($repair);
            }
        }

        return response()->json($grouped);
    }

    /**
     * Mark a repair as paid and register cash movement
     */
    public function markAsPaid(Request $request, int $id): RepairResource|JsonResponse
    {
        try {
            $validated = $request->validate([
                'payment_method_id' => 'required|integer|exists:payment_methods,id',
                'amount_paid' => 'nullable|numeric|min:0.01|max:999999999.99',
                'branch_id' => 'required|integer|exists:branches,id',
            ]);

            $repair = $this->repairs->markAsPaid($id, $validated);
            return new RepairResource($repair);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}

