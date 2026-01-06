<?php

namespace App\Services;

use App\Interfaces\CustomerServiceInterface;
use App\Interfaces\CurrentAccountServiceInterface;
use App\Models\Customer;
use App\Models\Person;
use App\Models\CurrentAccount;
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
        return Customer::with(['person.fiscalCondition'])->get();
    }

    public function getCustomerById($id)
    {
        return Customer::with(['person.fiscalCondition'])->find($id);
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

            // Crear cuenta corriente automáticamente
            $currentAccountData = [
                'customer_id' => $customer->id,
                'credit_limit' => $data['credit_limit'] ?? null, // NULL = límite infinito
                'notes' => 'Cuenta corriente creada automáticamente al crear el cliente',
            ];

            $this->currentAccountService->createAccount($currentAccountData);

            return $customer->load('person');
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
                'email' => $data['email'] ?? $customer->email,
                'active' => array_key_exists('active', $data) ? $data['active'] : $customer->active,
                'notes' => $data['notes'] ?? $customer->notes,
            ]);

            return $customer->load('person');
        });
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