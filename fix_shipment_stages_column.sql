-- Script para renombrar la columna 'active' a 'is_active' en shipment_stages

ALTER TABLE shipment_stages 
CHANGE COLUMN active is_active TINYINT(1) NOT NULL DEFAULT 1;

