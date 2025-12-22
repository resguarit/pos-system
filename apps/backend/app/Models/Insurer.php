<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Insurer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'contact_email',
        'contact_phone',
        'notes',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    // Relationships
    public function repairs()
    {
        return $this->hasMany(Repair::class);
    }
}
