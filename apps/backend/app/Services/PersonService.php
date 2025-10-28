<?php

namespace App\Services;

use App\Models\Person;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class PersonService
{
    /**
     * Create a new Person record.
     *
     * @param array $data Data for creating the person. Expected keys:
     *                    'first_name', 'last_name', 'cuit', 'address', 'phone',
     *                    'fiscal_condition_id', 'person_type_id', 'credit_limit'.
     * @return Person The created Person instance.
     * @throws Exception If creation fails.
     */
    public function createPerson(array $data): Person
    {
        DB::beginTransaction();
        try {
            // Ensure only fillable fields are used, potentially add validation logic here or in a Request object
            $personData = [
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'cuit' => $data['cuit'] ?? null,
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'fiscal_condition_id' => $data['fiscal_condition_id'] ?? null,
                'person_type_id' => $data['person_type_id'] ?? null,
                'credit_limit' => $data['credit_limit'] ?? null, // NULL = límite infinito
                // 'person_type' might be set automatically based on context (Customer, Supplier, User)
                // or passed explicitly if needed. Let's assume it's handled by thesi calling service for now.
            ];

            $person = Person::create($personData);

            DB::commit();
            return $person;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error creating person: " . $e->getMessage());
            // Re-throw the exception to be handled by the calling service/controller
            throw new Exception("Failed to create person record.");
        }
    }

    /**
     * Update an existing Person record.
     *
     * @param Person $person The Person instance to update.
     * @param array $data Data for updating the person. Only provided keys will be updated.
     * @return bool True on success, false otherwise.
     * @throws Exception If update fails.
     */
    public function updatePerson(Person $person, array $data): bool
    {
        DB::beginTransaction();
        try {
            // Filter data to only include fields that are actually present in the input array
            $updateData = array_filter($data, function ($key) use ($person) {
                // Check if the key exists in the model's fillable array
                return in_array($key, $person->getFillable());
            }, ARRAY_FILTER_USE_KEY);

            // Remove keys with null values if you don't want to overwrite existing data with null
            // $updateData = array_filter($updateData, fn($value) => !is_null($value));

            if (empty($updateData)) {
                // No valid data provided for update
                DB::commit(); // Commit transaction even if nothing changed
                return true; // Or false depending on desired behavior
            }

            $updated = $person->update($updateData);

            DB::commit();
            return $updated;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error updating person ID {$person->id}: " . $e->getMessage());
            // Re-throw the exception
            throw new Exception("Failed to update person record.");
        }
    }

    /**
     * Find a Person by ID.
     *
     * @param int $id
     * @return Person|null
     */
    public function findPersonById(int $id): ?Person
    {
        return Person::find($id);
    }

    /**
     * Delete a Person record.
     * Consider if soft delete is sufficient or if related records need handling.
     *
     * @param Person $person
     * @return bool|null Result of the delete operation.
     * @throws Exception If deletion fails.
     */
    public function deletePerson(Person $person): ?bool
    {
        DB::beginTransaction();
        try {
            // Handle related records if necessary before deleting Person
            // e.g., if deleting a Person should also delete the Customer/User/Supplier record

            $deleted = $person->delete(); // Uses soft delete if enabled on the model

            DB::commit();
            return $deleted;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error deleting person ID {$person->id}: " . $e->getMessage());
            throw new Exception("Failed to delete person record.");
        }
    }
}
