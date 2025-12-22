<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientServicePayment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'client_service_id',
        'amount',
        'payment_date',
        'notes'
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function service()
    {
        return $this->belongsTo(ClientService::class, 'client_service_id');
    }
}
