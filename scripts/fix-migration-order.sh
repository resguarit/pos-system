#!/bin/bash
# Script para corregir el orden de las migraciones de combos

cd "$(dirname "$0")/../apps/backend/database/migrations" || exit 1

echo "🔄 Renombrando migraciones para corregir el orden..."

# 1. Mover create_combos_table ANTES de add_combo_fields (2025_05_15)
if [ -f "2025_10_20_000001_create_combos_table.php" ]; then
    mv 2025_10_20_000001_create_combos_table.php 2025_05_14_170000_create_combos_table.php
    echo "✅ Renombrado: create_combos_table.php"
else
    echo "⚠️  Archivo ya renombrado o no existe"
fi

# 2. Mover create_combo_items_table ANTES de add_combo_fields
if [ -f "2025_10_20_000002_create_combo_items_table.php" ]; then
    mv 2025_10_20_000002_create_combo_items_table.php 2025_05_14_170001_create_combo_items_table.php
    echo "✅ Renombrado: create_combo_items_table.php"
else
    echo "⚠️  Archivo ya renombrado o no existe"
fi

# 3. Mover change_combo_items_quantity DESPUÉS de create_combo_items
if [ -f "2025_10_19_102806_change_combo_items_quantity_to_integer.php" ]; then
    mv 2025_10_19_102806_change_combo_items_quantity_to_integer.php 2025_05_14_170002_change_combo_items_quantity_to_integer.php
    echo "✅ Renombrado: change_combo_items_quantity_to_integer.php"
else
    echo "⚠️  Archivo ya renombrado o no existe"
fi

echo ""
echo "📋 Verificando orden de migraciones relacionadas con combos:"
ls -1 *.php | sort | grep -E "(combos|combo_items|add_combo_fields)" | head -5

echo ""
echo "✅ Orden corregido. Ahora puedes ejecutar: php artisan migrate --force"

