<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class SaleIva extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $table = 'sale_ivas'; // Especificar nombre de tabla si no sigue convención

    protected $fillable = [
        'sale_header_id',
        'iva_id',
        'base_amount',
        'iva_amount',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('sale_iva')
            ->logOnlyDirty();
    }

    protected $casts = [
        'base_amount' => 'decimal:3',
        'iva_amount' => 'decimal:3',
    ];

    public function saleHeader()
    {
        return $this->belongsTo(SaleHeader::class);
    }

    public function iva()
    {
        return $this->belongsTo(Iva::class);
    }
}