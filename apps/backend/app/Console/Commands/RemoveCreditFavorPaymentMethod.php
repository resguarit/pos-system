<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PaymentMethod;

class RemoveCreditFavorPaymentMethod extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:remove-credit-favor';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Removes the "Crédito a favor" payment method if it exists';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Searching for "Crédito a favor" payment method...');

        // Buscamos por nombre exacto o aproximado para asegurar
        $paymentMethods = PaymentMethod::where('name', 'LIKE', '%Crédito a favor%')->get();

        if ($paymentMethods->isEmpty()) {
            $this->info('Payment method "Crédito a favor" not found.');
            return 0;
        }

        foreach ($paymentMethods as $paymentMethod) {
            $this->info("Found payment method: {$paymentMethod->name} (ID: {$paymentMethod->id})");

            // Check if it's used in sales (simple check if relation exists or manual count)
            // Assuming we don't have the relationship set up or want to be safe with try-catch

            try {
                $paymentMethod->delete();
                $this->info("Payment method '{$paymentMethod->name}' deleted successfully.");
            } catch (\Exception $e) {
                // Check for foreign key constraint violation
                if (str_contains($e->getMessage(), 'Integrity constraint violation')) {
                    $this->warn("Cannot delete payment method '{$paymentMethod->name}' because it might be used in existing sales.");

                    // Force deactivation
                    $paymentMethod->is_active = false;
                    $paymentMethod->save();
                    $this->info("Payment method '{$paymentMethod->name}' has been DEACTIVATED instead.");
                } else {
                    $this->error('An error occurred: ' . $e->getMessage());
                }
            }
        }

        return 0;
    }
}
