<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // Opcional: si usas SoftDeletes

class PaymentMethod extends Model
{
    use HasFactory;
    // use SoftDeletes; // Opcional: si usas SoftDeletes

    protected $fillable = [
        'name',
        'description',
        'is_active',
        'affects_cash',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'affects_cash' => 'boolean',
    ];
}
