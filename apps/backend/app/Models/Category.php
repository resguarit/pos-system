<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Category extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $fillable = ['name', 'description', 'parent_id'];

    protected $dates = ['deleted_at'];

    /**
     * Get the parent category.
     */
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Get the child categories (subcategories).
     */
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * Get all descendant categories recursively.
     */
    public function descendants()
    {
        return $this->children()->with('descendants');
    }

    /**
     * Check if category is a parent category (has no parent).
     */
    public function isParent()
    {
        return is_null($this->parent_id);
    }

    /**
     * Check if category is a subcategory (has a parent).
     */
    public function isSubcategory()
    {
        return !is_null($this->parent_id);
    }

    /**
     * Get only parent categories (categories without parent).
     */
    public function scopeParents($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Get only subcategories (categories with parent).
     */
    public function scopeSubcategories($query)
    {
        return $query->whereNotNull('parent_id');
    }

    /**
     * Get the products for the category.
     */
    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'description', 'parent_id'])
            ->useLogName('category')
            ->logOnlyDirty();
    }
}