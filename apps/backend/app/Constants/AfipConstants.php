<?php

declare(strict_types=1);

namespace App\Constants;

/**
 * Constantes AFIP para facturación electrónica.
 * Centraliza códigos de tipo de comprobante, condición IVA y documento (DocTipo).
 * Alineado con Resguar\AfipSdk\Helpers\InvoiceMapper (RG 5616).
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

    /** DocTipo: Sin identificar / Consumidor final */
    public const DOC_TIPO_SIN_IDENTIFICAR = 99;

    /** DocTipo: Consumidor final (alias de DOC_TIPO_SIN_IDENTIFICAR) */
    public const DOC_TIPO_CONSUMIDOR_FINAL = 99;

    /** Longitud esperada del CUIT (solo dígitos) */
    public const CUIT_LENGTH = 11;

    /** Cantidad de dígitos del número de comprobante (con ceros a la izquierda) */
    public const RECEIPT_NUMBER_PADDING = 8;

    // --- Condición IVA del receptor (RG 5616 - obligatorio desde 1/12/2025) ---
    /** Condición IVA: Responsable Inscripto */
    public const CONDICION_IVA_RESPONSABLE_INSCRIPTO = 1;

    /** Condición IVA: Exento */
    public const CONDICION_IVA_EXENTO = 4;

    /** Condición IVA: Consumidor Final */
    public const CONDICION_IVA_CONSUMIDOR_FINAL = 5;

    /** Condición IVA: Monotributo */
    public const CONDICION_IVA_MONOTRIBUTO = 6;

    // --- Tipos de comprobante (códigos numéricos AFIP) ---
    /** Factura A */
    public const COMPROBANTE_FACTURA_A = 1;

    /** Factura B */
    public const COMPROBANTE_FACTURA_B = 6;

    /** Factura C */
    public const COMPROBANTE_FACTURA_C = 11;

    // --- Conceptos ---
    /** Concepto: Productos */
    public const CONCEPTO_PRODUCTOS = 1;

    /** Concepto: Servicios */
    public const CONCEPTO_SERVICIOS = 2;

    /**
     * Mapeo de nombres de condiciones fiscales a códigos AFIP.
     * Usado como fallback cuando fiscal_conditions.afip_code es null.
     */
    private const FISCAL_CONDITION_NAME_MAP = [
        'responsable inscripto' => self::CONDICION_IVA_RESPONSABLE_INSCRIPTO,
        'responsable inscrito' => self::CONDICION_IVA_RESPONSABLE_INSCRIPTO,
        'ri' => self::CONDICION_IVA_RESPONSABLE_INSCRIPTO,
        'monotributista' => self::CONDICION_IVA_MONOTRIBUTO,
        'monotributo' => self::CONDICION_IVA_MONOTRIBUTO,
        'consumidor final' => self::CONDICION_IVA_CONSUMIDOR_FINAL,
        'cf' => self::CONDICION_IVA_CONSUMIDOR_FINAL,
        'exento' => self::CONDICION_IVA_EXENTO,
        'iva exento' => self::CONDICION_IVA_EXENTO,
    ];

    /**
     * Resuelve el código AFIP de condición IVA desde un objeto FiscalCondition.
     * Prioriza afip_code, y si es null, intenta resolver por nombre.
     *
     * @param mixed $fiscalCondition Objeto con propiedades afip_code y name
     * @param int $default Valor por defecto si no se puede resolver
     * @return int Código AFIP de condición IVA
     */
    public static function resolveConditionIvaCode($fiscalCondition, int $default = self::CONDICION_IVA_CONSUMIDOR_FINAL): int
    {
        if ($fiscalCondition === null) {
            return $default;
        }

        // Priorizar afip_code si existe y no es null
        $afipCode = $fiscalCondition->afip_code ?? null;
        if ($afipCode !== null && $afipCode !== '') {
            return (int) $afipCode;
        }

        // Fallback: resolver por nombre de la condición fiscal
        $name = $fiscalCondition->name ?? null;
        if ($name !== null && $name !== '') {
            $normalizedName = strtolower(trim($name));
            if (isset(self::FISCAL_CONDITION_NAME_MAP[$normalizedName])) {
                return self::FISCAL_CONDITION_NAME_MAP[$normalizedName];
            }
        }

        return $default;
    }

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
