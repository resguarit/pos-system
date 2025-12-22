<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\ExpenseReminder;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class Expense extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $with = ['category'];

    protected $fillable = [
        'branch_id',
        'category_id',
        'employee_id',
        'user_id',
        'payment_method_id',
        'cash_movement_id',
        'description',
        'amount',
        'date',
        'due_date',
        'status',
        'is_recurring',
        'recurrence_interval',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->useLogName('expense')
            ->logOnlyDirty();
    }

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
        'due_date' => 'date',
        'is_recurring' => 'boolean',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function category()
    {
        return $this->belongsTo(ExpenseCategory::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function cashMovement()
    {
        return $this->belongsTo(CashMovement::class);
    }

    public function reminders()
    {
        return $this->hasMany(ExpenseReminder::class);
    }
}
