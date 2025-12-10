<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'parent_id',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function parent()
    {
        return $this->belongsTo(ExpenseCategory::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(ExpenseCategory::class, 'parent_id');
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class, 'category_id');
    }
}
