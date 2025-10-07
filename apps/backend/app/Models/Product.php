<?php

namespace App\Models;

use App\Services\PricingService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Log;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Product extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'products';
    
    private ?PricingService $pricingService = null;
    protected $fillable = [
        'description',
        'code',
        'measure_id',
        'unit_price',
        'currency',
        'markup',
        'sale_price',
        'category_id',
        'iva_id',
        'image_id',
        'supplier_id',
        'status',
        'web',
        'observaciones',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'markup' => 'decimal:4',
        'sale_price' => 'decimal:2',
        'status' => 'boolean',
        'web' => 'boolean',
    ];

    protected $appends = ['sale_price', 'barcode'];

    /**
     * Obtiene el servicio de precios (lazy loading)
     */
    private function getPricingService(): PricingService
    {
        if ($this->pricingService === null) {
            $this->pricingService = new PricingService();
        }
        return $this->pricingService;
    }

    /**
     * Precio de venta calculado dinámicamente usando PricingService
     * Si hay un valor guardado en la base de datos, lo usa; sino calcula dinámicamente
     */
    protected function salePrice(): Attribute
    {
        return Attribute::make(
            get: function () {
                // Si hay un sale_price almacenado en la base de datos (precio manual), usarlo
                $storedSalePrice = $this->attributes['sale_price'] ?? null;
                
                if ($storedSalePrice !== null && $storedSalePrice > 0) {
                    return (float) $storedSalePrice;
                }

                // Si no hay precio manual, calcular dinámicamente (precio automático)
                $unitPrice = $this->unit_price ?? 0;
                $markup = $this->markup ?? 0;
                $currency = $this->currency ?? 'ARS';
                $ivaId = $this->iva_id ?? null;

                // Obtener la tasa de IVA como decimal
                $ivaRate = null;
                if ($ivaId) {
                    $iva = \App\Models\Iva::find($ivaId);
                    $ivaRate = $iva ? $iva->rate / 100 : null;
                }

                return $this->getPricingService()->calculateSalePrice(
                    $unitPrice,
                    $currency,
                    $markup,
                    $ivaRate
                );
            }
        );
    }

    /**
     * Calcula el markup basado en un precio de venta objetivo
     * 
     * @param float $targetSalePrice Precio de venta objetivo
     * @return float Markup calculado
     */
    public function calculateMarkupFromSalePrice(float $targetSalePrice): float
    {
        return $this->getPricingService()->calculateMarkup(
            $this->unit_price ?? 0,
            $this->currency ?? 'ARS',
            $targetSalePrice,
            $this->iva_id
        );
    }

    /**
     * Calcula el precio de venta basado en el markup actual
     * 
     * @return float Precio de venta calculado
     */
    public function calculateSalePriceFromMarkup(): float
    {
        return $this->getPricingService()->calculateSalePrice(
            $this->unit_price ?? 0,
            $this->currency ?? 'ARS',
            $this->markup ?? 0,
            $this->iva_id
        );
    }

    /**
     * Valida los parámetros de precio del producto
     * 
     * @return bool True si los parámetros son válidos
     */
    public function validatePricing(): bool
    {
        return $this->getPricingService()->validatePricingParameters(
            $this->unit_price ?? 0,
            $this->markup ?? 0,
            $this->sale_price ?? null
        );
    }

    /**
     * Obtener el precio unitario en ARS
     */
    public function getUnitPriceInARSAttribute()
    {
        return $this->getPricingService()->getUnitPriceInArs(
            $this->unit_price ?? 0,
            $this->currency ?? 'ARS'
        );
    }

    /**
     * Obtener el precio de venta en ARS (siempre en pesos)
     */
    public function getSalePriceInARSAttribute()
    {
        return $this->sale_price;
    }

    // Getter para exponer 'barcode' como alias de 'code' en la API
    public function getBarcodeAttribute()
    {
        return $this->code;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['description', 'code', 'measure', 'measure_id', 'unit_price', 'currency', 'markup', 'category_id', 'iva_id', 'image_id', 'supplier_id', 'status', 'web', 'observaciones'])
            ->useLogName('product')
            ->logOnlyDirty();
    }

    public function measure()
    {
        return $this->belongsTo(Measure::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function iva()
    {
        return $this->belongsTo(Iva::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function stocks()
    {
        return $this->hasMany(Stock::class);
    }
}
