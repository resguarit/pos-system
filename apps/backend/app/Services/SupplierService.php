<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\SupplierTaxIdentity;
use App\Interfaces\SupplierServiceInterface;
use App\Models\Person; // Add this
use App\Services\PersonService; // Add this
use Illuminate\Support\Facades\DB; // Add this
use Illuminate\Support\Facades\Log; // Add this
use App\Interfaces\CurrentAccountServiceInterface; // Add this
use Exception;

class SupplierService implements SupplierServiceInterface
{
    protected $personService;
    protected $currentAccountService; // Add this property

    // Modify the constructor to inject PersonService and CurrentAccountService
    public function __construct(PersonService $personService, CurrentAccountServiceInterface $currentAccountService)
    {
        $this->personService = $personService;
        $this->currentAccountService = $currentAccountService;
    }

    public function getAllSuppliers()
    {
        // Eager load person data and count products
        return Supplier::with(['person', 'taxIdentities.fiscalCondition'])
            ->withCount('products')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function createSupplier(array $data): Supplier
    {
        DB::beginTransaction();
        try {
            $person = null;
            // Check if person data is provided to create/link a person
            if (!empty($data['first_name']) && !empty($data['last_name'])) {
                // Use PersonService to create the person
                $person = $this->personService->createPerson([
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'cuit' => $data['cuit'] ?? null,
                    'address' => $data['address'] ?? null,
                    'phone' => $data['phone'] ?? null,
                    // 'person_type_id' => ... // Set appropriate type ID if needed
                ]);
                $data['person_id'] = $person->id;
            } elseif (!empty($data['person_id'])) {
                // Link to an existing person if only person_id is provided
                $person = $this->personService->findPersonById($data['person_id']);
                if (!$person) {
                    throw new Exception("Person with ID {$data['person_id']} not found.");
                }
            }

            // Create the supplier, ensuring person_id is included
            $supplierData = [
                'name' => $data['name'] ?? ($person ? $person->full_name : 'N/A'),
                'contact_name' => $data['contact_name'] ?? ($person ? $person->full_name : null),
                'phone' => $data['phone'] ?? ($person ? $person->phone : null),
                'email' => $data['email'] ?? null,
                'cuit' => $data['cuit'] ?? ($person ? $person->cuit : null),
                'address' => $data['address'] ?? ($person ? $person->address : null),
                'person_type_id' => $data['person_type_id'] ?? 1,
                'status' => $data['status'] ?? 'active',
                'person_id' => $data['person_id'] ?? null,
            ];

            // Filter out null values if the database columns don't have defaults or aren't nullable
            // $supplierData = array_filter($supplierData, fn($value) => !is_null($value));

            $supplier = Supplier::create($supplierData);

            // Handle tax identities
            $this->syncTaxIdentities($supplier, $data);

            // Automatically create a current account for the new supplier
            try {
                $this->currentAccountService->createAccount([
                    'supplier_id' => $supplier->id,
                    'current_balance' => 0,
                    'status' => 'active',
                    'notes' => 'Cuenta corriente creada automáticamente al registrar el proveedor',
                ]);
            } catch (Exception $e) {
                // Log warning but don't fail supplier creation if account creation fails?
                // Or should we fail? Given the requirement "every time a supplier is created...", we should probably fail transaction.
                // However, createAccount throws if exists. Since this is a NEW supplier, it shouldn't exist.
                // Re-throwing ensures consistency.
                Log::warning("Could not create current account for new supplier ID {$supplier->id}: " . $e->getMessage());
                throw $e;
            }

            DB::commit();
            return $supplier->load(['person', 'taxIdentities.fiscalCondition']); // Eager load person and tax identities
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error creating supplier: " . $e->getMessage());
            throw $e; // Re-throw exception
        }
    }
    public function getSupplierById(int $id): ?Supplier // Add type hints and return type
    {
        // Find or fail is okay, but find allows checking if null
        return Supplier::with([
            'person',
            'taxIdentities.fiscalCondition',
            'products' => function ($query) {
                $query->select('id', 'code', 'description', 'unit_price', 'supplier_id', 'status')
                    ->where('deleted_at', null);
            }
        ])->withCount('products')->find($id);
    }

    public function updateSupplier(int $id, array $data): Supplier // Add type hints and return type
    {
        DB::beginTransaction();
        try {
            $supplier = Supplier::with('person')->find($id); // Eager load person
            if (!$supplier) {
                throw new Exception("Supplier not found");
            }

            $person = $supplier->person; // Get the currently associated person

            // Check if new person data is provided to update the associated person
            $personUpdateData = array_filter([
                'first_name' => $data['first_name'] ?? null,
                'last_name' => $data['last_name'] ?? null,
                'cuit' => $data['cuit'] ?? null,
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
            ], fn($value) => !is_null($value));


            if ($person && !empty($personUpdateData)) {
                // Use PersonService to update the associated person
                $this->personService->updatePerson($person, $personUpdateData);
                // Refresh person data in case it's used as fallback
                $person->refresh();
            } elseif (!$person && !empty($personUpdateData['first_name']) && !empty($personUpdateData['last_name'])) {
                // If no person was associated, but now data is provided, create and link a new person
                $person = $this->personService->createPerson($personUpdateData);
                $data['person_id'] = $person->id; // Ensure the supplier gets linked
            } elseif (isset($data['person_id']) && $data['person_id'] !== $supplier->person_id) {
                // If person_id is explicitly changed, link to the new person
                $newPerson = $this->personService->findPersonById($data['person_id']);
                if (!$newPerson && !is_null($data['person_id'])) { // Allow unlinking by passing null
                    throw new Exception("New Person with ID {$data['person_id']} not found.");
                }
                $person = $newPerson; // Update local variable for supplier data fallback
                $data['person_id'] = $person ? $person->id : null; // Ensure correct ID or null is set
            }

            // Prepare supplier update data
            $supplierUpdateData = array_filter([
                'name' => $data['name'] ?? null,
                'contact_name' => $data['contact_name'] ?? null,
                'phone' => $data['phone'] ?? null, // Use supplier specific phone if provided
                'email' => $data['email'] ?? null,
                'cuit' => $data['cuit'] ?? null, // Use supplier specific CUIT if provided
                'address' => $data['address'] ?? null, // Use supplier specific address if provided
                'person_type_id' => $data['person_type_id'] ?? null,
                'status' => $data['status'] ?? null,
                'person_id' => $data['person_id'] ?? null, // Update person_id if changed
            ], fn($value) => !is_null($value));

            // Handle explicit person_id change even if null
            if (array_key_exists('person_id', $data)) {
                $supplierUpdateData['person_id'] = $data['person_id'];
            }
            if (array_key_exists('person_type_id', $data)) {
                $supplierUpdateData['person_type_id'] = $data['person_type_id'];
            }


            if (!empty($supplierUpdateData)) {
                $supplier->update($supplierUpdateData);
            }

            // Handle tax identities
            $this->syncTaxIdentities($supplier, $data);

            DB::commit();
            return $supplier->load(['person', 'taxIdentities.fiscalCondition']); // Return updated model with person and tax identities
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error updating supplier ID {$id}: " . $e->getMessage());
            throw $e; // Re-throw exception
        }
    }

    /**
     * Sync tax identities for a supplier.
     * 
     * @param Supplier $supplier
     * @param array $data
     * @return void
     */
    protected function syncTaxIdentities(Supplier $supplier, array $data): void
    {
        // If tax_identities array is provided, sync them
        if (isset($data['tax_identities']) && is_array($data['tax_identities'])) {
            $existingIds = [];
            $hasDefault = false;

            foreach ($data['tax_identities'] as $index => $identityData) {
                // Skip empty entries
                if (empty($identityData['cuit']) && empty($identityData['business_name'])) {
                    continue;
                }

                $identityFields = [
                    'cuit' => $identityData['cuit'] ?? null,
                    'business_name' => $identityData['business_name'] ?? null,
                    'fiscal_condition_id' => $identityData['fiscal_condition_id'] ?? 1,
                    'is_default' => (bool) ($identityData['is_default'] ?? false),
                    'cbu' => $identityData['cbu'] ?? null,
                    'cbu_alias' => $identityData['cbu_alias'] ?? null,
                    'bank_name' => $identityData['bank_name'] ?? null,
                    'account_holder' => $identityData['account_holder'] ?? null,
                ];

                // Ensure at least one is default
                if ($identityFields['is_default']) {
                    $hasDefault = true;
                }

                if (!empty($identityData['id'])) {
                    // Update existing
                    $identity = SupplierTaxIdentity::find($identityData['id']);
                    if ($identity && $identity->supplier_id === $supplier->id) {
                        $identity->update($identityFields);
                        $existingIds[] = $identity->id;
                    }
                } else {
                    // Create new
                    $identity = $supplier->taxIdentities()->create($identityFields);
                    $existingIds[] = $identity->id;
                }
            }

            // If no default was set, make the first one default
            if (!$hasDefault && count($existingIds) > 0) {
                SupplierTaxIdentity::where('id', $existingIds[0])->update(['is_default' => true]);
            }

            // Ensure only one default
            if ($hasDefault) {
                $defaultIdentity = $supplier->taxIdentities()
                    ->whereIn('id', $existingIds)
                    ->where('is_default', true)
                    ->first();
                
                if ($defaultIdentity) {
                    $supplier->taxIdentities()
                        ->where('id', '!=', $defaultIdentity->id)
                        ->update(['is_default' => false]);
                }
            }

            // Delete tax identities that are no longer in the list
            $supplier->taxIdentities()
                ->whereNotIn('id', $existingIds)
                ->delete();
        } 
        // Backward compatibility: if no tax_identities but cuit is provided, create/update default
        elseif (!empty($data['cuit'])) {
            $defaultIdentity = $supplier->taxIdentities()->where('is_default', true)->first();
            
            $identityData = [
                'cuit' => $data['cuit'],
                'business_name' => $data['name'] ?? null,
                'fiscal_condition_id' => $data['fiscal_condition_id'] ?? 1,
                'is_default' => true,
            ];

            if ($defaultIdentity) {
                $defaultIdentity->update($identityData);
            } else {
                $supplier->taxIdentities()->create($identityData);
            }
        }
    }

    public function deleteSupplier(int $id): bool // Add type hint and return type
    {
        DB::beginTransaction();
        try {
            $supplier = $this->getSupplierById($id);
            if (!$supplier) {
                // Already deleted or never existed
                DB::commit();
                return true; // Or false/throw exception depending on desired behavior
            }

            // Option 1: Only delete supplier
            $deleted = $supplier->delete();

            // Option 2: Delete supplier AND associated person (if desired and exists)
            // if ($supplier->person) {
            //     $personDeleted = $this->personService->deletePerson($supplier->person);
            //     $deleted = $supplier->delete() && $personDeleted;
            // } else {
            //     $deleted = $supplier->delete();
            // }


            DB::commit();
            return $deleted ?? false;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error deleting supplier ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }

    public function checkNameExists($name): bool
    {
        return Supplier::where('name', $name)->exists();
    }
}