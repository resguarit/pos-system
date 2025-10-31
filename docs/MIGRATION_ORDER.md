# 🔄 Orden Correcto de Migraciones

Este documento define el orden correcto de ejecución de todas las migraciones para evitar errores de dependencias.

## ⚠️ Problemas Detectados

1. **`2025_05_15_165355_add_combo_fields_to_sale_items.php`** necesita que la tabla `combos` exista, pero `2025_10_20_000001_create_combos_table.php` se ejecuta después.
2. **`2025_10_19_102806_change_combo_items_quantity_to_integer.php`** necesita que la tabla `combo_items` exista, pero `2025_10_20_000002_create_combo_items_table.php` se ejecuta después.

## 📋 Orden Correcto (Renombrar Archivos)

Renombra los archivos con estas fechas para que se ejecuten en el orden correcto:

### 1. Sistema Base (0001 - 2025_04_15)
```
0001_01_01_000000_create_users_table.php
0001_01_01_000001_create_cache_table.php
0001_01_01_000002_create_jobs_table.php
2025_04_15_133746_create_personal_access_tokens_table.php
2025_04_15_140140_create_branches_table.php
2025_04_15_140142_create_activity_log_table.php
```

### 2. Catálogos y Productos (2025_04_16)
```
2025_04_16_120001_create_measures_table.php
2025_04_16_120002_create_categories_table.php
2025_04_16_120003_create_ivas_table.php
2025_04_16_120004_create_suppliers_table.php
2025_04_16_120005_create_products_table.php
```

### 3. Sistema Fiscal y Personas (2025_04_22)
```
2025_04_22_122950_create_stocks_table.php
2025_04_22_143606_create_fiscal_conditions_table.php
2025_04_22_144311_create_person_types_table.php
2025_04_22_145020_create_roles_table.php
2025_04_22_145100_create_document_types_table.php
2025_04_22_145113_create_people_table.php
2025_04_22_145137_create_customers_table.php
2025_04_22_145647_modify_users_table_add_person_relation.php
2025_04_22_152358_create_branch_user_table.php
```

### 4. Permisos (2025_04_30)
```
2025_04_30_141535_create_permissions_table.php
2025_04_30_141717_permission_role.php
```

### 5. Ventas Base (2025_05_14)
```
2025_05_14_125838_receipt_type.php
2025_05_14_131240_other_taxes.php
2025_05_14_132638_create_payment_methods_table.php
2025_05_14_153141_create_sales_header_table.php
2025_05_14_165354_create_sale_items_table.php
2025_05_14_165600_create_sale_ivas_table.php
```

### 6. Combos (ANTES de add_combo_fields) ⚠️ MOVER AQUÍ
```
2025_05_14_170000_create_combos_table.php                    ← RENOMBRAR desde 2025_10_20_000001
2025_05_14_170001_create_combo_items_table.php              ← RENOMBRAR desde 2025_10_20_000002
```

### 7. Campos de Combo en Sale Items (2025_05_15) - AHORA PUEDE EJECUTARSE
```
2025_05_15_120000_add_annulment_fields_to_sales_table.php
2025_05_15_165355_add_combo_fields_to_sale_items.php        ← YA PUEDE EJECUTARSE
```

### 8. Más Campos de Sale Items (2025_05_20)
```
2025_05_20_agg_campos_sale_items.php
```

### 9. Órdenes de Compra (2025_06_03 - 2025_06_06)
```
2025_06_03_000001_alter_suppliers_status_enum.php
2025_06_05_120000_create_purchase_orders_table.php
2025_06_05_120001_create_purchase_order_items_table.php
2025_06_06_164931_change_subtotal_to_decimal_in_purchase_order_items_table.php
2025_06_06_165112_change_total_amount_to_decimal_in_purchase_orders_table.php
```

### 10. Pagos y Roles (2025_06_24 - 2025_06_27)
```
2025_06_24_141240_create_sale_payment_table.php
2025_06_25_000001_create_role_user_table.php
2025_06_27_000001_add_last_login_at_to_users_table.php
```

### 11. Caja (2025_07_11 - 2025_07_17)
```
2025_07_11_143921_fix_sale_payments_table_column.php
2025_07_17_152319_create_cash_system_tables.php
```

### 12. Productos - Moneda y Cambios (2025_08_21)
```
2025_08_21_000001_add_currency_to_products_table.php
2025_08_21_000002_create_exchange_rates_table.php
2025_08_21_160500_alter_products_code_to_string.php
```

### 13. Movimientos de Caja (2025_08_23)
```
2025_08_23_004100_alter_cash_movements_add_user_and_reference.php
```

### 14. Reparaciones (2025_08_25)
```
2025_08_25_000001_create_repairs_table.php
2025_08_25_000002_create_repair_notes_table.php
2025_08_25_000003_add_sale_id_to_repairs_table.php
```

### 15. Descuentos (2025_08_28)
```
2025_08_28_120001_add_discounts_to_sales_header.php
2025_08_28_120002_add_discounts_to_sale_items.php
```

### 16. Métodos de Pago (2025_09_04)
```
2025_09_04_073943_add_payment_method_id_to_cash_movements_table.php
2025_09_04_120000_add_payment_method_id_to_purchase_orders_table.php
```

### 17. Categorías (2025_09_05 - 2025_09_06)
```
2025_09_05_083431_add_description_to_categories_table.php
2025_09_05_211420_add_calculated_fields_to_cash_registers_table.php
2025_09_06_134415_add_parent_id_to_categories_table.php
```

### 18. Settings y Usuarios (2025_09_08 - 2025_09_09)
```
2025_09_08_000001_create_settings_table.php
2025_09_08_135156_add_hidden_field_to_users_table.php
2025_09_09_092608_update_products_markup_to_decimal.php
```

### 19. Órdenes de Compra - Moneda (2025_09_10)
```
2025_09_10_112707_add_currency_to_purchase_orders_table.php
```

### 20. Productos - Más Campos (2025_09_19 - 2025_09_26)
```
2025_09_19_105500_make_phone_and_email_nullable_in_branches_table.php
2025_09_22_133945_add_sale_price_to_products_table.php
2025_09_23_090013_add_target_manual_price_to_products_table.php
2025_09_26_104150_make_measure_id_and_supplier_id_nullable_in_products_table.php
```

### 21. Afecta Caja (2025_10_08)
```
2025_10_08_091711_add_affects_cash_to_payment_methods_table.php
2025_10_08_095959_add_affects_cash_register_to_purchase_orders_table.php
2025_10_08_100119_add_affects_balance_to_cash_movements_table.php
```

### 22. Cambio en Combo Items (DESPUÉS de crear combo_items) ⚠️ MOVER AQUÍ
```
2025_10_19_102806_change_combo_items_quantity_to_integer.php  ← YA PUEDE EJECUTARSE
```

### 23. Cuentas Corrientes (2025_10_22 - 2025_10_23)
```
2025_10_22_090726_update_current_accounts_table_add_new_fields.php
2025_10_22_090801_update_current_account_movements_table_add_new_fields.php
2025_10_22_125228_modify_credit_limit_to_nullable.php
2025_10_22_125426_update_existing_credit_limits_to_null.php
2025_10_23_200456_add_closed_status_to_current_accounts_table.php
2025_10_23_202145_add_paid_amount_to_sales_header_table.php
```

### 24. Zonas de Entrega (2025_10_24)
```
2025_10_24_172826_create_delivery_zones_table.php
```

### 25. Sistema de Envíos (2025_10_27 - 2025_10_28)
```
2025_10_27_131247_add_missing_columns_to_shipment_stages_table.php
2025_10_27_131943_add_reference_and_other_columns_to_shipments_table.php
2025_10_27_132054_fix_shipments_table_columns.php
2025_10_27_162430_add_shipping_fields_to_shipments_table.php
2025_10_28_094759_add_shipping_cost_and_payment_fields_to_shipments_table.php
2025_10_28_215648_create_shipment_system_tables.php
2025_10_28_220532_fix_shipment_stages_active_column.php
```

## 🔧 Comandos para Renombrar

Ejecuta estos comandos en el servidor para renombrar las migraciones problemáticas:

```bash
cd /home/api.hela-ditos.com.ar/public_html/apps/backend/database/migrations

# 1. Mover create_combos_table ANTES de add_combo_fields
mv 2025_10_20_000001_create_combos_table.php 2025_05_14_170000_create_combos_table.php

# 2. Mover create_combo_items_table ANTES de add_combo_fields (justo después de combos)
mv 2025_10_20_000002_create_combo_items_table.php 2025_05_14_170001_create_combo_items_table.php

# 3. Mover change_combo_items_quantity DESPUÉS de create_combo_items (pero antes de octubre)
mv 2025_10_19_102806_change_combo_items_quantity_to_integer.php 2025_05_14_170002_change_combo_items_quantity_to_integer.php
```

## ✅ Verificación del Orden

Después de renombrar, verifica el orden:

```bash
cd /home/api.hela-ditos.com.ar/public_html/apps/backend/database/migrations
ls -1 *.php | sort | grep -E "(combos|combo_items|add_combo_fields)" | head -5
```

Deberías ver:
```
2025_05_14_170000_create_combos_table.php
2025_05_14_170001_create_combo_items_table.php
2025_05_14_170002_change_combo_items_quantity_to_integer.php
2025_05_15_165355_add_combo_fields_to_sale_items.php
```

## 📝 Resumen de Cambios

**Archivos a renombrar:**

1. `2025_10_20_000001_create_combos_table.php` → `2025_05_14_170000_create_combos_table.php`
2. `2025_10_20_000002_create_combo_items_table.php` → `2025_05_14_170001_create_combo_items_table.php`
3. `2025_10_19_102806_change_combo_items_quantity_to_integer.php` → `2025_05_14_170002_change_combo_items_quantity_to_integer.php`

**Orden final correcto:**
- ✅ `combos` se crea ANTES de que `sale_items` necesite la foreign key
- ✅ `combo_items` se crea ANTES de que se modifique su columna `quantity`
- ✅ Todo el resto mantiene el orden cronológico original

