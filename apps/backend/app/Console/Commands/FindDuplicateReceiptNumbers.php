<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SaleHeader;
use Illuminate\Support\Facades\DB;

class FindDuplicateReceiptNumbers extends Command
{
    protected $signature = 'sales:find-duplicates {--fix : Intentar corregir los duplicados automáticamente}';
    protected $description = 'Encontrar ventas con números de comprobante duplicados por sucursal y tipo';

    public function handle()
    {
        $this->info('🔍 Buscando números de comprobante duplicados...');
        $this->newLine();

        // Buscar duplicados agrupando por branch_id, receipt_type_id y receipt_number
        $duplicates = DB::table('sales_header')
            ->select('branch_id', 'receipt_type_id', 'receipt_number', DB::raw('COUNT(*) as count'))
            ->whereNull('deleted_at') // Solo ventas no eliminadas
            ->groupBy('branch_id', 'receipt_type_id', 'receipt_number')
            ->having('count', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            $this->info('✅ No se encontraron números de comprobante duplicados.');
            return 0;
        }

        $this->warn("⚠️  Se encontraron {$duplicates->count()} grupos de números duplicados:");
        $this->newLine();

        $totalAffected = 0;

        foreach ($duplicates as $duplicate) {
            $sales = SaleHeader::where('branch_id', $duplicate->branch_id)
                ->where('receipt_type_id', $duplicate->receipt_type_id)
                ->where('receipt_number', $duplicate->receipt_number)
                ->whereNull('deleted_at')
                ->orderBy('id', 'asc')
                ->get();

            $branch = $sales->first()->branch;
            $receiptType = $sales->first()->receiptType;

            $branchName = $branch ? ($branch->description ?? 'N/A') : 'N/A';
            $receiptTypeName = $receiptType ? ($receiptType->description ?? 'N/A') : 'N/A';
            
            $this->line("📋 Sucursal: {$branchName} | Tipo: {$receiptTypeName} | Número: {$duplicate->receipt_number}");
            $this->line("   Cantidad de ventas con este número: {$duplicate->count}");
            $this->newLine();

            $this->table(
                ['ID', 'Fecha', 'Cliente', 'Total', 'Estado', 'Anulada'],
                $sales->map(function ($sale) {
                    $customer = $sale->customer;
                    $customerName = $customer && $customer->person 
                        ? "{$customer->person->first_name} {$customer->person->last_name}"
                        : 'N/A';
                    
                    $status = $sale->annulled_at ? '❌ Anulada' : '✅ Activa';
                    
                    return [
                        $sale->id,
                        $sale->date->format('Y-m-d H:i'),
                        $customerName,
                        '$' . number_format($sale->total, 2, ',', '.'),
                        $status,
                        $sale->annulled_at ? $sale->annulled_at->format('Y-m-d H:i') : '-'
                    ];
                })->toArray()
            );

            $totalAffected += $sales->count();
            $this->newLine();
        }

        $this->info("📊 Total de ventas afectadas: {$totalAffected}");
        $this->newLine();

        if ($this->option('fix')) {
            if (!$this->confirm('⚠️  ¿Desea corregir estos duplicados automáticamente? Esto renumerará las ventas duplicadas.', false)) {
                $this->info('Operación cancelada.');
                return 0;
            }

            return $this->fixDuplicates($duplicates);
        } else {
            $this->comment('💡 Ejecuta con --fix para intentar corregir automáticamente los duplicados.');
            $this->comment('   Ejemplo: php artisan sales:find-duplicates --fix');
        }

        return 0;
    }

    private function fixDuplicates($duplicates): int
    {
        $this->info('🔧 Iniciando corrección de duplicados...');
        $this->newLine();

        $fixed = 0;
        $errors = 0;

        DB::beginTransaction();

        try {
            foreach ($duplicates as $duplicate) {
                $sales = SaleHeader::where('branch_id', $duplicate->branch_id)
                    ->where('receipt_type_id', $duplicate->receipt_type_id)
                    ->where('receipt_number', $duplicate->receipt_number)
                    ->whereNull('deleted_at')
                    ->orderBy('id', 'asc')
                    ->get();

                // Mantener la primera venta (más antigua por ID) con el número original
                $firstSale = $sales->first();
                $salesToRenumber = $sales->skip(1);

                $this->line("📝 Manteniendo venta ID {$firstSale->id} con número {$duplicate->receipt_number}");

                // Renumerar las demás
                foreach ($salesToRenumber as $sale) {
                    // Buscar el siguiente número disponible
                    $nextNumber = $this->findNextAvailableNumber(
                        $sale->branch_id,
                        $sale->receipt_type_id
                    );

                    $oldNumber = $sale->receipt_number;
                    $sale->receipt_number = $nextNumber;
                    $sale->save();

                    $this->line("   ✓ Venta ID {$sale->id}: {$oldNumber} → {$nextNumber}");
                    $fixed++;
                }

                $this->newLine();
            }

            DB::commit();
            $this->info("✅ Corrección completada. {$fixed} ventas renumeradas.");
            return 0;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Error al corregir duplicados: " . $e->getMessage());
            return 1;
        }
    }

    private function findNextAvailableNumber(int $branchId, int $receiptTypeId): string
    {
        $lastSale = SaleHeader::where('branch_id', $branchId)
            ->where('receipt_type_id', $receiptTypeId)
            ->orderByRaw('CAST(receipt_number AS UNSIGNED) DESC')
            ->first();

        $nextNumber = $lastSale ? ((int)$lastSale->receipt_number) + 1 : 1;

        // Verificar que el número no esté en uso
        $attempts = 0;
        while (
            SaleHeader::where('branch_id', $branchId)
                ->where('receipt_type_id', $receiptTypeId)
                ->where('receipt_number', str_pad($nextNumber, 8, '0', STR_PAD_LEFT))
                ->whereNull('deleted_at')
                ->exists() 
            && $attempts < 100
        ) {
            $nextNumber++;
            $attempts++;
        }

        return str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
    }
}

