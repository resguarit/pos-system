<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Customer;
use App\Models\CurrentAccount;
use App\Interfaces\CurrentAccountServiceInterface;
use Illuminate\Support\Facades\DB;

class CreateCurrentAccountsForExistingCustomers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'current-accounts:create-for-existing-customers';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Crear cuentas corrientes para todos los clientes existentes que no tengan una';

    protected $currentAccountService;

    /**
     * Create a new command instance.
     */
    public function __construct(CurrentAccountServiceInterface $currentAccountService)
    {
        parent::__construct();
        $this->currentAccountService = $currentAccountService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando creación de cuentas corrientes para clientes existentes...');

        // Obtener todos los clientes que no tienen cuenta corriente
        $customersWithoutAccount = Customer::whereDoesntHave('currentAccount')->get();

        if ($customersWithoutAccount->isEmpty()) {
            $this->info('Todos los clientes ya tienen cuenta corriente.');
            return;
        }

        $this->info("Encontrados {$customersWithoutAccount->count()} clientes sin cuenta corriente.");

        $bar = $this->output->createProgressBar($customersWithoutAccount->count());
        $bar->start();

        $created = 0;
        $errors = 0;

        foreach ($customersWithoutAccount as $customer) {
            try {
                DB::transaction(function () use ($customer) {
                    $currentAccountData = [
                        'customer_id' => $customer->id,
                        'credit_limit' => $customer->person->credit_limit ?? 0,
                        'notes' => 'Cuenta corriente creada automáticamente para cliente existente',
                    ];
                    
                    $this->currentAccountService->createAccount($currentAccountData);
                });
                
                $created++;
            } catch (\Exception $e) {
                $this->error("Error creando cuenta para cliente {$customer->id}: " . $e->getMessage());
                $errors++;
            }
            
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $this->info("✅ Cuentas corrientes creadas: {$created}");
        if ($errors > 0) {
            $this->warn("⚠️  Errores encontrados: {$errors}");
        }

        $this->info('Proceso completado.');
    }
}