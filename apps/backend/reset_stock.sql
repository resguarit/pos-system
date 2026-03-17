-- Script SQL para poner todo el stock a 0
-- Advertencia: Esto actualizará el stock actual de todos los productos en todas las sucursales a 0.

UPDATE stocks
SET current_stock = 0;

-- Opcional: Si quieres registrar un movimiento de stock para auditar que se puso a 0, 
-- puedes insertar registros en la tabla stock_movements (requiere saber el usuario y sucursal).
-- Por simplicidad, la consulta de arriba solo sobreescribe el stock actual.
