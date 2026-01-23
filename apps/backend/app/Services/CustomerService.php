<?php

namespace App\Services;

use App\Interfaces\CustomerServiceInterface;
use App\Interfaces\CurrentAccountServiceInterface;
use App\Models\Customer;
use App\Models\Person;
use App\Models\CurrentAccount;
use App\Models\CustomerTaxIdentity;
use App\Exceptions\ConflictException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // import Log facade
use App\Models\SaleHeader; // Asegúrate de incluir el modelo SaleHeader

class CustomerService implements CustomerServiceInterface
{
    protected $currentAccountService;

    public function __construct(CurrentAccountServiceInterface $currentAccountService)
    {
        $this->currentAccountService = $currentAccountService;
    }
    public function getAllCustomers()
    {
        return Customer::with(['person.fiscalCondition', 'taxIdentities.fiscalCondition'])->orderBy('created_at', 'desc')->get();
    }

    public function getCustomerById($id)
    {
        return Customer::with(['person.fiscalCondition', 'taxIdentities.fiscalCondition'])->find($id);
    }

    public function createCustomer(array $data)
    {

        return DB::transaction(function () use ($data) {
            // Preparando los datos para la persona
            $personData = [
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'cuit' => $data['cuit'] ?? null,
                'address' => $data['address'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'postal_code' => $data['postal_code'] ?? null,
                'phone' => $data['phone'] ?? null,
                'fiscal_condition_id' => isset($data['fiscal_condition_id']) && $data['fiscal_condition_id'] ? $data['fiscal_condition_id'] : 1, // Default a 1 si es nulo o 0
                'person_type_id' => isset($data['person_type_id']) && $data['person_type_id'] ? $data['person_type_id'] : 1, // Default a 1 si es nulo o 0
                'document_type_id' => isset($data['document_type_id']) && $data['document_type_id'] ? $data['document_type_id'] : 1,
                'documento' => isset($data['documento']) && $data['documento'] ? $data['documento'] : 0,
                'credit_limit' => $data['credit_limit'] ?? null, // NULL = límite infinito
            ];

            $person = Person::create($personData);

            $customer = Customer::create([
                'person_id' => $person->id,
                'email' => $data['email'] ?? null,
                'active' => $data['active'] ?? true,
                'notes' => $data['notes'] ?? null,
            ]);

            // Handle tax identities
            $this->syncTaxIdentities($customer, $data);

            // Crear cuenta corriente automáticamente
            $currentAccountData = [
                'customer_id' => $customer->id,
                'credit_limit' => $data['credit_limit'] ?? null, // NULL = límite infinito
                'notes' => 'Cuenta corriente creada automáticamente al crear el cliente',
            ];

            $this->currentAccountService->createAccount($currentAccountData);

            return $customer->load(['person', 'taxIdentities.fiscalCondition']);
        });
    }
    public function updateCustomer($id, array $data)
    {

        return DB::transaction(function () use ($id, $data) {
            $customer = Customer::with('person')->find($id);
            if (!$customer)
                return null;

            $personData = [
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'cuit' => $data['cuit'] ?? null,
                'address' => $data['address'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'postal_code' => $data['postal_code'] ?? null,
                'phone' => $data['phone'] ?? null,
                'fiscal_condition_id' => isset($data['fiscal_condition_id']) && $data['fiscal_condition_id'] ? $data['fiscal_condition_id'] : 1, // Default a 1 si es nulo o 0
                'person_type_id' => isset($data['person_type_id']) && $data['person_type_id'] ? $data['person_type_id'] : 1, // Default a 1 si es nulo o 0
                'document_type_id' => isset($data['document_type_id']) && $data['document_type_id'] ? $data['document_type_id'] : 1,
                'documento' => isset($data['documento']) && $data['documento'] ? $data['documento'] : 0,
                'credit_limit' => $data['credit_limit'] ?? 0,
            ];

            $customer->person->update($personData);

            $customer->update([
                'email' => array_key_exists('email', $data) ? $data['email'] : $customer->email,
                'active' => array_key_exists('active', $data) ? $data['active'] : $customer->active,
                'notes' => array_key_exists('notes', $data) ? $data['notes'] : $customer->notes,
            ]);

            // Handle tax identities
            $this->syncTaxIdentities($customer, $data);

            return $customer->load(['person', 'taxIdentities.fiscalCondition']);
        });
    }

    /**
     * Sync tax identities for a customer.
     * 
     * @param Customer $customer
     * @param array $data
     * @return void
     */
    protected function syncTaxIdentities(Customer $customer, array $data): void
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
                    $identity = CustomerTaxIdentity::find($identityData['id']);
                    if ($identity && $identity->customer_id === $customer->id) {
                        $identity->update($identityFields);
                        $existingIds[] = $identity->id;
                    }
                } else {
                    // Create new
                    $identity = $customer->taxIdentities()->create($identityFields);
                    $existingIds[] = $identity->id;
                }
            }

            // If no default was set, make the first one default
            if (!$hasDefault && count($existingIds) > 0) {
                CustomerTaxIdentity::where('id', $existingIds[0])->update(['is_default' => true]);
            }

            // Ensure only one default
            if ($hasDefault) {
                $defaultIdentity = $customer->taxIdentities()
                    ->whereIn('id', $existingIds)
                    ->where('is_default', true)
                    ->first();
                
                if ($defaultIdentity) {
                    $customer->taxIdentities()
                        ->where('id', '!=', $defaultIdentity->id)
                        ->update(['is_default' => false]);
                }
            }

            // Delete tax identities that are no longer in the list
            $customer->taxIdentities()
                ->whereNotIn('id', $existingIds)
                ->delete();
        } 
        // Backward compatibility: if no tax_identities but cuit is provided, create/update default
        elseif (!empty($data['cuit'])) {
            $defaultIdentity = $customer->taxIdentities()->where('is_default', true)->first();
            
            $identityData = [
                'cuit' => $data['cuit'],
                'business_name' => trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')),
                'fiscal_condition_id' => $data['fiscal_condition_id'] ?? 1,
                'is_default' => true,
            ];

            if ($defaultIdentity) {
                $defaultIdentity->update($identityData);
            } else {
                $customer->taxIdentities()->create($identityData);
            }
        }
    }

    public function deleteCustomer($id)
    {
        return DB::transaction(function () use ($id) {
            $customer = Customer::find($id);
            if (!$customer) {
                return false;
            }

            // Verificar cuenta corriente y validar que no tenga deuda ni saldo a favor
            $currentAccount = CurrentAccount::where('customer_id', $customer->id)->first();
            if ($currentAccount && $currentAccount->current_balance != 0) {
                $balance = (float) $currentAccount->current_balance;
                $balanceFormatted = number_format(abs($balance), 2, ',', '.');

                if ($balance > 0) {
                    // Balance positivo = el cliente debe dinero
                    throw new ConflictException("No se puede eliminar el cliente. Tiene una deuda de \${$balanceFormatted} en su cuenta corriente. Debe estar en \$0.");
                } else {
                    // Balance negativo = el cliente tiene saldo a favor
                    throw new ConflictException("No se puede eliminar el cliente. Tiene un saldo a favor de \${$balanceFormatted} en su cuenta corriente. Debe estar en \$0.");
                }
            }

            // Si existe cuenta corriente con balance 0, eliminarla
            if ($currentAccount) {
                $currentAccount->delete();
            }

            // Delete tax identities (will be soft deleted due to cascade)
            $customer->taxIdentities()->delete();

            // Eliminar cliente
            $customer->delete();

            // Eliminar persona asociada
            $customer->person()->delete();

            return true;
        });
    }

    public function getCustomerSalesSummary($id, $fromDate = null, $toDate = null)
    {
        $salesQuery = SaleHeader::where('customer_id', $id);
        if ($fromDate) {
            $salesQuery->whereDate('date', '>=', $fromDate);
        }
        if ($toDate) {
            $salesQuery->whereDate('date', '<=', $toDate);
        }
        // Si no hay fechas, trae todo el histórico
        $sales = $salesQuery->get();

        $totalSales = $sales->count();
        $totalAmount = $sales->sum('total');
        $totalIva = $sales->sum('total_iva_amount');
        $averageSaleAmount = $totalSales > 0 ? $totalAmount / $totalSales : 0;

        return [
            'sales_count' => $totalSales,
            'grand_total_amount' => $totalAmount,
            'grand_total_iva' => $totalIva,
            'average_sale_amount' => $averageSaleAmount,
        ];
    }

    public function searchCustomers($searchTerm)
    {
        return Customer::with(['person.fiscalCondition'])
            ->where(function ($query) use ($searchTerm) {
                // Buscar en el email del customer
                $query->where('email', 'like', "%{$searchTerm}%");
            })
            ->orWhereHas('person', function ($query) use ($searchTerm) {
                $query->where('first_name', 'like', "%{$searchTerm}%")
                    ->orWhere('last_name', 'like', "%{$searchTerm}%")
                    ->orWhere('cuit', 'like', "%{$searchTerm}%")
                    ->orWhere('documento', 'like', "%{$searchTerm}%")
                    ->orWhere('phone', 'like', "%{$searchTerm}%")
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$searchTerm}%"]);
            })
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();
    }

    public function checkNameExists($firstName, $lastName): bool
    {
        return Customer::whereHas('person', function ($query) use ($firstName, $lastName) {
            $query->where('first_name', $firstName)
                ->where('last_name', $lastName);
        })->exists();
    }
}