<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'person_id',
        'user_id',
        'branch_id',
        'job_title',
        'salary',
        'hire_date',
        'status',
    ];

    protected $casts = [
        'salary' => 'decimal:2',
        'hire_date' => 'date',
    ];

    public function person()
    {
        return $this->belongsTo(Person::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }
}
