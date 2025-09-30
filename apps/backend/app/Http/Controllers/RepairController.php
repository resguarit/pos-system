<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Interfaces\RepairServiceInterface;
use App\Http\Resources\RepairResource;
use App\Http\Resources\RepairNoteResource;

class RepairController extends Controller
{
    public function __construct(private RepairServiceInterface $repairs)
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        // Optional query params: from_date, to_date (YYYY-MM-DD) to filter by intake_date
        $data = $this->repairs->list($request->all());
        return RepairResource::collection($data);
    }

    public function show(int $id)
    {
        $repair = $this->repairs->find($id);
        if (!$repair) return response()->json(['message' => 'Not found'], 404);
        return new RepairResource($repair);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|integer|exists:customers,id',
            'branch_id' => 'required|integer|exists:branches,id',
            'device' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'issue_description' => 'required|string',
            'priority' => 'required|in:Alta,Media,Baja',
            'estimated_date' => 'nullable|date',
            'technician_id' => 'nullable|integer|exists:users,id',
            'initial_notes' => 'nullable|string',
            'cost' => 'nullable|numeric',
        ]);

        $validated['user_id'] = $request->user()->id;
        $repair = $this->repairs->create($validated);
        return (new RepairResource($repair))->response()->setStatusCode(201);
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'device' => 'sometimes|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'issue_description' => 'sometimes|string',
            'priority' => 'sometimes|in:Alta,Media,Baja',
            'estimated_date' => 'nullable|date',
            'technician_id' => 'nullable|integer|exists:users,id',
            'cost' => 'nullable|numeric',
            'status' => 'nullable|in:Recibido,En diagnóstico,En reparación,Esperando repuestos,Terminado,Entregado',
            'sale_id' => 'nullable|integer|exists:sales_header,id',
        ]);

        $repair = $this->repairs->update($id, $validated);
        return new RepairResource($repair);
    }

    public function destroy(int $id)
    {
        $this->repairs->delete($id);
        return response()->json(['message' => 'Deleted']);
    }

    public function updateStatus(Request $request, int $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:Recibido,En diagnóstico,En reparación,Esperando repuestos,Terminado,Entregado',
        ]);
        $repair = $this->repairs->updateStatus($id, $validated['status']);
        return new RepairResource($repair);
    }

    public function assign(Request $request, int $id)
    {
        $validated = $request->validate([
            'technician_id' => 'required|integer|exists:users,id',
        ]);
        $repair = $this->repairs->assignTechnician($id, $validated['technician_id']);
        return new RepairResource($repair);
    }

    public function addNote(Request $request, int $id)
    {
        $validated = $request->validate([
            'note' => 'required|string',
        ]);
        $this->repairs->addNote($id, $request->user()->id, $validated['note']);
        return response()->json(['message' => 'Note added']);
    }

    public function stats(Request $request)
    {
        // Optional query params: from_date, to_date (YYYY-MM-DD)
        $stats = $this->repairs->stats($request->all());
        return response()->json($stats);
    }

    public function options()
    {
        return response()->json([
            'statuses' => ['Recibido', 'En diagnóstico', 'En reparación', 'Esperando repuestos', 'Terminado', 'Entregado'],
            'priorities' => ['Alta', 'Media', 'Baja'],
        ]);
    }
}
