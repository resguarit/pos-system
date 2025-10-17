<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Branch;

class UpdateBranchColorsSeeder extends Seeder
{
    public function run(): void
    {
        // Actualizar colores de sucursales existentes
        $branches = Branch::all();
        
        $colors = [
            '#0ea5e9', // Azul (Steuber Inc - mantener)
            '#10b981', // Verde (Deposito)
            '#f59e0b', // Amarillo
            '#ef4444', // Rojo
            '#8b5cf6', // Púrpura
            '#06b6d4', // Cian
            '#84cc16', // Lima
            '#f97316', // Naranja
        ];
        
        foreach ($branches as $index => $branch) {
            $color = $colors[$index % count($colors)];
            $branch->update(['color' => $color]);
            
            $this->command->info("Updated branch '{$branch->description}' with color: {$color}");
        }
    }
}
