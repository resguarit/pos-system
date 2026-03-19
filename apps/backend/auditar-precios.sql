-- =============================================================================
-- SCRIPT DE AUDITORÍA DE CAMBIOS DE PRECIOS
-- =============================================================================
-- Ejecutar en el servidor de producción para investigar cambios inesperados.
-- Requiere acceso a las tablas: activity_log, product_cost_histories, products
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. VERIFICAR CAMBIOS EN activity_log (Spatie Activity Log)
--    Muestra TODOS los eventos de actualización de productos con cambio de precio
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    al.id                                               AS audit_id,
    al.created_at                                       AS fecha,
    u.name                                              AS usuario,
    u.email                                             AS email,
    al.subject_id                                       AS product_id,
    p.code                                              AS codigo_producto,
    p.description                                       AS descripcion_producto,
    al.event                                            AS evento,
    al.description                                      AS descripcion_evento,
    JSON_UNQUOTE(JSON_EXTRACT(al.properties, '$.old.unit_price'))  AS precio_anterior,
    JSON_UNQUOTE(JSON_EXTRACT(al.properties, '$.attributes.unit_price')) AS precio_nuevo,
    al.properties                                       AS propiedades_completas
FROM activity_log al
LEFT JOIN users u  ON al.causer_id = u.id AND al.causer_type = 'App\\Models\\User'
LEFT JOIN products p ON al.subject_id = p.id
WHERE
    al.subject_type = 'App\\Models\\Product'
    AND al.event IN ('updated', 'created')
    AND JSON_EXTRACT(al.properties, '$.attributes.unit_price') IS NOT NULL
    -- Filtrar por fecha (ajustar según cuando ocurrió el problema):
    -- AND al.created_at >= '2026-03-18 00:00:00'
    -- AND al.created_at <= '2026-03-20 00:00:00'
ORDER BY al.created_at DESC
LIMIT 200;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. VERIFICAR CAMBIOS EN product_cost_histories
--    Muestra el historial de cambios de costos por producto
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    pch.id,
    pch.created_at                                      AS fecha,
    u.name                                              AS usuario,
    p.code                                              AS codigo_producto,
    p.description                                       AS descripcion_producto,
    pch.previous_cost                                   AS costo_anterior,
    pch.new_cost                                        AS costo_nuevo,
    ROUND(((pch.new_cost - pch.previous_cost) / NULLIF(pch.previous_cost, 0)) * 100, 2) AS variacion_pct,
    pch.source_type                                     AS origen,
    pch.notes                                           AS notas
FROM product_cost_histories pch
LEFT JOIN products p ON pch.product_id = p.id
LEFT JOIN users u ON pch.user_id = u.id
WHERE
    pch.new_cost != pch.previous_cost
    -- Filtrar por fecha (ajustar según cuando ocurrió el problema):
    -- AND pch.created_at >= '2026-03-18 00:00:00'
    -- AND pch.created_at <= '2026-03-20 00:00:00'
    -- Filtrar por código de producto específico:
    -- AND p.code IN ('7791432889068', '7791432889051', '50010')
ORDER BY pch.created_at DESC
LIMIT 200;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BUSCAR PRODUCTOS ESPECÍFICOS POR CÓDIGO (los del caso reportado)
--    Para ver todos los cambios de un producto puntual
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    pch.id,
    pch.created_at                                      AS fecha,
    u.name                                              AS usuario,
    p.id                                                AS product_id,
    p.code                                              AS codigo,
    p.description                                       AS descripcion,
    pch.previous_cost                                   AS costo_anterior,
    pch.new_cost                                        AS costo_nuevo,
    pch.source_type                                     AS origen,
    pch.notes                                           AS notas
FROM product_cost_histories pch
JOIN products p ON pch.product_id = p.id
LEFT JOIN users u ON pch.user_id = u.id
WHERE p.code IN ('50010', '7791432889068', '7791432889051')
ORDER BY p.code, pch.created_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AGRUPAR POR SESIÓN: Ver qué productos se modificaron en el mismo momento
--    Muestra grupos de cambios (posible bulk update) por fecha y usuario
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    DATE_FORMAT(pch.created_at, '%Y-%m-%d %H:%i') AS minuto,
    u.name                                         AS usuario,
    pch.source_type                                AS origen,
    pch.notes                                      AS operacion,
    COUNT(*)                                       AS cantidad_productos_modificados,
    GROUP_CONCAT(p.code ORDER BY p.code SEPARATOR ', ') AS codigos_afectados
FROM product_cost_histories pch
LEFT JOIN products p ON pch.product_id = p.id
LEFT JOIN users u ON pch.user_id = u.id
WHERE pch.new_cost != pch.previous_cost
GROUP BY DATE_FORMAT(pch.created_at, '%Y-%m-%d %H:%i'), u.name, pch.source_type, pch.notes
ORDER BY minuto DESC
LIMIT 50;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PRODUCTOS MODIFICADOS EN LAS ÚLTIMAS 24/48/72 HORAS
--    Vista rápida de cambios recientes
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    pch.created_at                                      AS fecha,
    u.name                                              AS usuario,
    p.code                                              AS codigo,
    p.description                                       AS descripcion,
    p.category_id,
    p.supplier_id,
    pch.previous_cost                                   AS precio_anterior,
    pch.new_cost                                        AS precio_nuevo,
    pch.source_type                                     AS origen
FROM product_cost_histories pch
JOIN products p ON pch.product_id = p.id
LEFT JOIN users u ON pch.user_id = u.id
WHERE
    pch.created_at >= NOW() - INTERVAL 72 HOUR
    AND pch.new_cost != pch.previous_cost
ORDER BY pch.created_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. VERIFICAR SI LOS PRODUCTOS MODIFICADOS COMPARTEN CATEGORÍA O PROVEEDOR
--    Esto ayuda a identificar si fue un bulk update por categoría/proveedor
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    c.name                                              AS categoria,
    s.name                                              AS proveedor,
    COUNT(DISTINCT pch.product_id)                      AS productos_modificados,
    MIN(pch.created_at)                                 AS primera_modificacion,
    MAX(pch.created_at)                                 AS ultima_modificacion
FROM product_cost_histories pch
JOIN products p ON pch.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE
    pch.new_cost != pch.previous_cost
    -- AND pch.created_at >= '2026-03-18 00:00:00'
GROUP BY c.name, s.name
HAVING COUNT(DISTINCT pch.product_id) > 1
ORDER BY productos_modificados DESC;
