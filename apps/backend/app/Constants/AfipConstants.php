<?php

declare(strict_types=1);

namespace App\Constants;

/**
 * Constantes AFIP para facturación electrónica.
 * Centraliza códigos de tipo de comprobante y de documento (DocTipo).
 *
 * @see https://www.afip.gob.ar/fe/documentos/TABLACOMPROBANTES.xls
 * @see docs/AFIP-TIPOS-COMPROBANTES.md
 */
final class AfipConstants
{
    /** Código tipo comprobante: Factura A (exige receptor con CUIT) */
    public const RECEIPT_CODE_FACTURA_A = '001';

    /** Código tipo comprobante: Presupuesto (solo uso interno, no AFIP) */
    public const RECEIPT_CODE_PRESUPUESTO = '016';

    /** Código tipo comprobante: Factura X (solo uso interno del sistema, no se autoriza con AFIP) */
    public const RECEIPT_CODE_FACTURA_X = '017';

    /** DocTipo: CUIT */
    public const DOC_TIPO_CUIT = 80;

    /** DocTipo: DNI */
    public const DOC_TIPO_DNI = 96;

    /** DocTipo: Consumidor final / no identificado */
    public const DOC_TIPO_CONSUMIDOR_FINAL = 99;

    /** Longitud esperada del CUIT (solo dígitos) */
    public const CUIT_LENGTH = 11;

    /** Cantidad de dígitos del número de comprobante (con ceros a la izquierda) */
    public const RECEIPT_NUMBER_PADDING = 8;

    /**
     * Indica si el tipo de comprobante exige un cliente con CUIT válido.
     * Solo Factura A (001) lo exige; B/C/M/FCE permiten consumidor final.
     */
    public static function receiptRequiresCuit(?string $afipCode): bool
    {
        return $afipCode !== null && (string) $afipCode === self::RECEIPT_CODE_FACTURA_A;
    }

    /**
     * Indica si el tipo de comprobante es presupuesto (solo uso interno).
     */
    public static function isPresupuesto(?string $afipCode): bool
    {
        return $afipCode !== null && (string) $afipCode === self::RECEIPT_CODE_PRESUPUESTO;
    }

    /**
     * Indica si el tipo de comprobante es Factura X (solo uso interno del sistema).
     */
    public static function isFacturaX(?string $afipCode): bool
    {
        return $afipCode !== null && (string) $afipCode === self::RECEIPT_CODE_FACTURA_X;
    }

    /**
     * Comprobantes de solo uso interno: no se autorizan con AFIP (Presupuesto, Factura X).
     */
    public static function isInternalOnlyReceipt(?string $afipCode): bool
    {
        return self::isPresupuesto($afipCode) || self::isFacturaX($afipCode);
    }

    /**
     * Normaliza y valida CUIT: solo dígitos, longitud 11.
     */
    public static function isValidCuit(?string $cuit): bool
    {
        if ($cuit === null || $cuit === '') {
            return false;
        }
        $digits = preg_replace('/[^0-9]/', '', $cuit);

        return strlen($digits) === self::CUIT_LENGTH;
    }
}
