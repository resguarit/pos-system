<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class ExpenseReminder extends Model
{
    use HasFactory, LogsActivity, LogsActivityWithContext;

    protected $fillable = [
        'expense_id',
        'user_id',
        'next_due_date',
        'status',
        'notified_at',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('expense_reminder')
            ->logOnlyDirty();
    }

    protected $casts = [
        'next_due_date' => 'date',
        'notified_at' => 'datetime',
    ];

    public function expense()
    {
        return $this->belongsTo(Expense::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope para recordatorios pendientes
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending')
            ->whereDate('next_due_date', '<=', now());
    }
}
