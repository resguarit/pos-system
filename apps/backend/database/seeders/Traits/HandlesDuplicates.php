<?php

namespace Database\Seeders\Traits;

trait HandlesDuplicates
{
    /**
     * Inserta registros evitando duplicados basados en una clave única.
     */
    protected function insertWithoutDuplicates(string $table, array $records, array $uniqueColumns = []): int
    {
        if (empty($records)) {
            return 0;
        }
        
        $inserted = 0;
        
        foreach ($records as $record) {
            $query = DB::table($table);
            
            // Construir la consulta WHERE basada en las columnas únicas
            foreach ($uniqueColumns as $column) {
                if (isset($record[$column])) {
                    $query->where($column, $record[$column]);
                }
            }
            
            // Solo insertar si no existe
            if (!$query->exists()) {
                DB::table($table)->insert($record);
                $inserted++;
            }
        }
        
        return $inserted;
    }
    
    /**
     * Limpia una tabla antes de insertar nuevos datos.
     */
    protected function truncateTable(string $table): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table($table)->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        
        if ($this->command) {
            $this->command->info("🗑️  Tabla {$table} limpiada");
        }
    }
    
    /**
     * Verifica si una tabla tiene datos.
     */
    protected function tableHasData(string $table): bool
    {
        return DB::table($table)->exists();
    }
}


