<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Shipment;
use App\Models\ShipmentEvent;

class ResetShipments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:reset-shipments {--force : Force the operation to run without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete all shipments and reset the counter (truncate tables)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->option('force') && !$this->confirm('Are you sure you want to delete ALL shipments? This cannot be undone.')) {
            $this->info('Operation cancelled.');
            return 1;
        }

        $this->info('Starting shipment reset...');

        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');

            $this->info('Truncating shipment_sale...');
            DB::table('shipment_sale')->truncate();

            $this->info('Truncating shipment_events...');
            ShipmentEvent::truncate();

            $this->info('Truncating shipments...');
            Shipment::truncate();

            DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            $this->info('All shipments deleted successfully. The shipment counter has been reset to 1.');

            return 0;

        } catch (\Exception $e) {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;'); // Ensure checks are re-enabled on error
            $this->error('An error occurred: ' . $e->getMessage());
            return 1;
        }
    }
}
