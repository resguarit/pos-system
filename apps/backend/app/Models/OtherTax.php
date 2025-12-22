<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class OtherTax extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    // Laravel asumirá que la tabla es 'other_taxes' por convención.
    // Si tu tabla se llama diferente, descomenta y ajusta la siguiente línea:
    // protected $table = 'nombre_de_tu_tabla_other_tax';

    /**
     * Indicates if the model should be timestamped.
     * Los timestamps (created_at, updated_at) ya los manejas en el seeder
     * y están definidos en tu migración.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'afip_code',
        'description',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('other_tax')
            ->logOnlyDirty();
    }
}
