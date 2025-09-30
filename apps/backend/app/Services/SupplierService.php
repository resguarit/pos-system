<?php

namespace App\Services;

use App\Models\Supplier;
use App\Interfaces\SupplierServiceInterface;
use App\Models\Person; // Add this
use App\Services\PersonService; // Add this
use Illuminate\Support\Facades\DB; // Add this
use Illuminate\Support\Facades\Log; // Add this
use Exception; // Add this

class SupplierService implements SupplierServiceInterface
{
    protected $personService; // Add this property

    // Modify the constructor to inject PersonService
    public function __construct(PersonService $personService)
    {
        $this->personService = $personService;
    }

    public function getAllSuppliers()
    {
        // Eager load person data and count products
        return Supplier::with('person')->withCount('products')->get();
    }

    public function createSupplier(array $data): Supplier // Add return type
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
                'status' => $data['status'] ?? 'active',
                'person_id' => $data['person_id'] ?? null,
            ];

            // Filter out null values if the database columns don't have defaults or aren't nullable
            // $supplierData = array_filter($supplierData, fn($value) => !is_null($value));

            $supplier = Supplier::create($supplierData);


            DB::commit();
            return $supplier->load('person'); // Eager load person
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error creating supplier: " . $e->getMessage());
            throw $e; // Re-throw exception
        }
    }    public function getSupplierById(int $id): ?Supplier // Add type hints and return type
    {
        // Find or fail is okay, but find allows checking if null
        return Supplier::with(['person', 'products' => function($query) {
            $query->select('id', 'code', 'description', 'unit_price', 'supplier_id', 'status')
                  ->where('deleted_at', null);
        }])->withCount('products')->find($id);
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
                'status' => $data['status'] ?? null,
                'person_id' => $data['person_id'] ?? null, // Update person_id if changed
            ], fn($value) => !is_null($value));

            // Handle explicit person_id change even if null
             if (array_key_exists('person_id', $data)) {
                $supplierUpdateData['person_id'] = $data['person_id'];
             }


            if (!empty($supplierUpdateData)) {
                $supplier->update($supplierUpdateData);
            }


            DB::commit();
            return $supplier->fresh('person'); // Return updated model with person
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error updating supplier ID {$id}: " . $e->getMessage());
            throw $e; // Re-throw exception
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