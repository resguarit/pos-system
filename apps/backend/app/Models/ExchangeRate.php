<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class ExchangeRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'from_currency',
        'to_currency',
        'rate',
        'is_active',
        'effective_date',
    ];

    protected $casts = [
        'rate' => 'decimal:4',
        'is_active' => 'boolean',
        'effective_date' => 'datetime',
    ];

    /**
     * Obtener la tasa de cambio actual para una conversión específica
     */
    public static function getCurrentRate($fromCurrency, $toCurrency)
    {
        if ($fromCurrency === $toCurrency) {
            return 1.0;
        }

        $rate = self::where('from_currency', $fromCurrency)
            ->where('to_currency', $toCurrency)
            ->where('is_active', true)
            ->where('effective_date', '<=', Carbon::now())
            ->orderBy('effective_date', 'desc')
            ->first();

        return $rate ? $rate->rate : null;
    }

    /**
     * Convertir un monto de una moneda a otra
     */
    public static function convert($amount, $fromCurrency, $toCurrency)
    {
        if ($fromCurrency === $toCurrency) {
            return $amount;
        }

        $rate = self::getCurrentRate($fromCurrency, $toCurrency);
        
        if ($rate === null) {
            throw new \Exception("No exchange rate found for {$fromCurrency} to {$toCurrency}");
        }

        return $amount * $rate;
    }

    /**
     * Obtener el precio en pesos argentinos desde cualquier moneda
     */
    public static function convertToARS($amount, $fromCurrency = 'USD')
    {
        return self::convert($amount, $fromCurrency, 'ARS');
    }
}
