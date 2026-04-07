<?php

namespace App\Console\Commands;

use App\Models\SaleHeader;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SetSaleDate extends Command
{
    protected $signature = 'sales:set-date
                            {receipt_number : Número de venta/comprobante (ej: 00000078)}
                            {date : Nueva fecha (YYYY-MM-DD o datetime parseable)}
                            {--branch= : Filtrar por branch_id}
                            {--receipt-type= : Filtrar por receipt_type_id}
                            {--id= : Actualizar por ID (si lo pasás, ignora receipt_number/filtros)}
                            {--start-of-day : Fuerza hora 00:00:00 (si pasás solo YYYY-MM-DD)}
                            {--dry-run : Muestra lo que haría sin guardar}';

    protected $description = 'Cambia la fecha (sales_header.date) de una venta por receipt_number o id.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $forceStartOfDay = (bool) $this->option('start-of-day');

        $id = $this->option('id');
        $receiptNumber = (string) $this->argument('receipt_number');
        $dateArg = (string) $this->argument('date');

        $query = SaleHeader::query();

        if ($id !== null) {
            $query->whereKey($id);
        } else {
            $query->where('receipt_number', $receiptNumber);

            if ($this->option('branch') !== null) {
                $query->where('branch_id', (int) $this->option('branch'));
            }

            if ($this->option('receipt-type') !== null) {
                $query->where('receipt_type_id', (int) $this->option('receipt-type'));
            }
        }

        $matches = $query->get(['id', 'date', 'receipt_number', 'branch_id', 'receipt_type_id', 'status']);

        if ($matches->isEmpty()) {
            $this->error('No se encontró ninguna venta que matchee los filtros.');
            return self::FAILURE;
        }

        if ($matches->count() > 1) {
            $this->error('Se encontraron múltiples ventas con ese receipt_number. Pasá --branch y --receipt-type (o --id).');
            $this->table(
                ['id', 'receipt_number', 'branch_id', 'receipt_type_id', 'status', 'date'],
                $matches->map(fn ($s) => [
                    $s->id,
                    $s->receipt_number,
                    $s->branch_id,
                    $s->receipt_type_id,
                    $s->status,
                    (string) $s->date,
                ])->all()
            );
            return self::FAILURE;
        }

        /** @var SaleHeader $sale */
        $sale = $matches->first();

        $original = $sale->date ? Carbon::parse($sale->date) : null;
        $parsed = Carbon::parse($dateArg);

        $dateOnly = (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateArg);
        if ($dateOnly && $original !== null && !$forceStartOfDay) {
            $parsed->setTime($original->hour, $original->minute, $original->second);
        } elseif ($dateOnly && $forceStartOfDay) {
            $parsed->startOfDay();
        }

        $this->line("Venta ID: {$sale->id}");
        $this->line("Receipt: {$sale->receipt_number} | Branch: {$sale->branch_id} | ReceiptType: {$sale->receipt_type_id}");
        $this->line('Fecha actual: ' . ($original ? $original->toDateTimeString() : 'NULL'));
        $this->line('Nueva fecha:  ' . $parsed->toDateTimeString());

        if ($dryRun) {
            $this->warn('[DRY RUN] No se guardaron cambios.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($sale, $parsed) {
            $sale->date = $parsed;
            $sale->save();
        });

        $this->info('✅ Fecha actualizada.');
        return self::SUCCESS;
    }
}

