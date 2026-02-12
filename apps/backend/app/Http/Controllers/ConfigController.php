<?php

namespace App\Http\Controllers;

use App\Services\MeasureService;
use App\Services\CategoryService;
use App\Services\IvaService;
use App\Services\SupplierService;
use App\Services\RoleService;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use App\Services\DocumentTypeService;
use App\Services\FiscalConditionService;

class ConfigController extends Controller
{
    protected $measureService;
    protected $categoryService;
    protected $ivaService;
    protected $supplierService;
    protected $roleService;
    protected $permissionService;
    protected $documentTypeService;
    protected $fiscalConditionService;

    public function __construct(
        MeasureService $measureService,
        CategoryService $categoryService,
        IvaService $ivaService,
        SupplierService $supplierService,
        RoleService $roleService,
        PermissionService $permissionService,
        DocumentTypeService $documentTypeService,
        FiscalConditionService $fiscalConditionService
        
    ) {
        $this->measureService = $measureService;
        $this->categoryService = $categoryService;
        $this->ivaService = $ivaService;
        $this->supplierService = $supplierService;
        $this->roleService = $roleService;
        $this->permissionService = $permissionService;
        $this->documentTypeService = $documentTypeService;
        $this->fiscalConditionService = $fiscalConditionService;
    }

    // Measures CRUD
    public function getMeasures()
    {
        return response()->json($this->measureService->getAllMeasures());
    }

    public function createMeasure(Request $request)
    {
        $validatedData = $request->validate(['name' => 'required|string']);
        return response()->json($this->measureService->createMeasure($validatedData));
    }

    public function updateMeasure(Request $request, $id)
    {
        $validatedData = $request->validate(['name' => 'sometimes|required|string']);
        return response()->json($this->measureService->updateMeasure($id, $validatedData));
    }

    public function deleteMeasure($id)
    {
        return response()->json($this->measureService->deleteMeasure($id));
    }

    public function getMeasureById($id)
    {
        return response()->json($this->measureService->getMeasureById($id));
    }

    // Categories CRUD
    public function getCategories()
    {
        return response()->json($this->categoryService->getAllCategories(null, null, \App\Models\Category::TYPE_PRODUCT));
    }

    public function createCategory(Request $request)
    {
        $validatedData = $request->validate(['name' => 'required|string']);
        $validatedData['category_type'] = \App\Models\Category::TYPE_PRODUCT;
        return response()->json($this->categoryService->createCategory($validatedData));
    }

    public function updateCategory(Request $request, $id)
    {
        $validatedData = $request->validate(['name' => 'sometimes|required|string']);
        return response()->json($this->categoryService->updateCategory($id, $validatedData, \App\Models\Category::TYPE_PRODUCT));
    }

    public function deleteCategory($id)
    {
        return response()->json($this->categoryService->deleteCategory($id, \App\Models\Category::TYPE_PRODUCT));
    }

    public function getCategoryById($id)
    {
        return response()->json($this->categoryService->getCategoryById($id, \App\Models\Category::TYPE_PRODUCT));
    }

    // Ivas CRUD
    public function getIvas()
    {
        return response()->json($this->ivaService->getAllIvas());
    }

    public function createIva(Request $request)
    {
        $validatedData = $request->validate([
            'rate' => 'required|numeric|unique:ivas,rate',
        ]);
        return response()->json($this->ivaService->createIva($validatedData));
    }

    public function updateIva(Request $request, $id)
    {
        $validatedData = $request->validate([
            'rate' => 'required|numeric|unique:ivas,rate,'.$id,
        ]);
        return response()->json($this->ivaService->updateIva($id, $validatedData));
    }

    public function deleteIva($id)
    {
        return response()->json($this->ivaService->deleteIva($id));
    }

    public function getIvaById($id)
    {
        return response()->json($this->ivaService->getIvaById($id));
    }

    // Roles
    public function getRoles()
    {
        try {
        return response()->json($this->roleService->getAllRoles());
        } catch (\Exception $e) {
            \Log::error("Error en getRoles: " . $e->getMessage()); // Loguea el error
            return response()->json(['message' => 'Error interno al obtener roles'], 500);
        }
    }

    public function getRoleById($id)
    {
        return response()->json($this->roleService->getRoleById($id));
    }

    public function createRole(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
        return response()->json($this->roleService->createRole($validated));
    }

    public function updateRole(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);
        return response()->json($this->roleService->updateRole($id, $validated));
    }

    public function deleteRole($id)
    {
        return response()->json($this->roleService->deleteRole($id));
    }

    public function getRolePermissions($id)
    {
        return response()->json($this->permissionService->getPermissionsByRoleId($id));
    }

    public function setRolePermissions(Request $request, $id)
    {
        $permissionIds = $request->input('permissions', []);
        $this->permissionService->setPermissionsForRole($id, $permissionIds);
        return response()->json(['message' => 'Permisos actualizados']);
    }

    public function getPermissions()
    {
        return response()->json($this->permissionService->getAllPermissions());
    }

    public function getPermissionsCountByRole(Request $request)
    {
        $query = \App\Models\Role::withCount('permissions');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%");
            });
        }

        $roles = $query->get();
        return response()->json($roles);
    }

    //Document Types
    
    public function getDocumentTypes()
    {
        return response()->json($this->documentTypeService->all());
    }

    public function getDocumentType($id)
    {
        return response()->json($this->documentTypeService->find($id));
    }

    public function storeDocumentType(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
        ]);
        return response()->json($this->documentTypeService->create($validated), 201);
    }

    public function updateDocumentType(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
        ]);
        return response()->json($this->documentTypeService->update($id, $validated));
    }

    public function deleteDocumentType($id)
    {
        $this->documentTypeService->delete($id);
        return response()->json(['success' => true]);
    }

    public function getFiscalConditions()
    {
        return response()->json($this->fiscalConditionService->getFiscalConditions());
    }

    // Receipt Types
    public function getReceiptTypes()
    {
        $receiptTypes = \App\Models\ReceiptType::all();
        return response()->json($receiptTypes);
    }
}