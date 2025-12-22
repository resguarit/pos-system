-- Script de importación de clientes desde sistema anterior
-- Ejecutar en MySQL: mysql -u usuario -p base_de_datos < import_customers.sql

-- Crear tabla temporal para los datos importados
DROP TEMPORARY TABLE IF EXISTS temp_import;
CREATE TEMPORARY TABLE temp_import (
    name VARCHAR(255),
    dni VARCHAR(50),
    phone VARCHAR(100)
);

-- Insertar todos los datos del sistema anterior aquí
-- (Pegar el contenido transformado)

-- EJEMPLO de cómo debería verse:
INSERT INTO temp_import (name, dni, phone) VALUES 
('CONSUMIDOR FINAL', '', ''),
('LUCAS RECIO', '23979343', '2215032798'),
('IGNACIO COLOMBO', '41006107', '2216745466');
-- ... continuar con todos los registros

-- Una vez que tengas los datos en temp_import, ejecutar:

-- Insertar en people y customers
INSERT INTO people (first_name, last_name, phone, documento, person_type, created_at, updated_at)
SELECT 
    CASE 
        WHEN LOCATE(' ', TRIM(name)) > 0 THEN SUBSTRING_INDEX(TRIM(name), ' ', 1)
        ELSE TRIM(name)
    END as first_name,
    CASE 
        WHEN LOCATE(' ', TRIM(name)) > 0 THEN TRIM(SUBSTRING(TRIM(name), LOCATE(' ', TRIM(name)) + 1))
        ELSE NULL
    END as last_name,
    NULLIF(TRIM(phone), '') as phone,
    NULLIF(TRIM(dni), '') as documento,
    'customer' as person_type,
    NOW() as created_at,
    NOW() as updated_at
FROM temp_import
WHERE TRIM(name) != '';

-- Crear los registros de customers para cada person creado
INSERT INTO customers (person_id, active, created_at, updated_at)
SELECT id, 1, NOW(), NOW()
FROM people 
WHERE person_type = 'customer'
AND id NOT IN (SELECT person_id FROM customers);

-- Limpiar
DROP TEMPORARY TABLE IF EXISTS temp_import;

-- Verificar
SELECT COUNT(*) as total_clientes FROM customers;
