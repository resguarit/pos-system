<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RepairNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'repair_id',
        'user_id',
        'note',
    ];

    public function repair()
    {
        return $this->belongsTo(Repair::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
