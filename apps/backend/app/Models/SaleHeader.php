<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

class SaleHeader extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $table = 'sales_header';

    protected $fillable = [
        'date',
        'receipt_type_id',
        'branch_id',
        'receipt_number',
        'customer_id',
        'sale_fiscal_condition_id',
        'sale_document_type_id',
        'sale_document_number',
        'subtotal',
        'total_iva_amount', // Nuevo campo para el total de IVA
        'iibb',
        'internal_tax',
        'discount_type',
        'discount_value',
        'discount_amount', // Renombrado de 'discount' para claridad
        'total',
        'cae',
        'cae_expiration_date',
        'service_from_date',
        'service_to_date',
        'service_due_date',
        'user_id',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'annulled_at',
        'annulled_by',
        'annulment_reason',
        'paid_amount',
        'payment_status',
        'metadata',
    ];

    protected $casts = [
        'date' => 'datetime',
        'subtotal' => 'decimal:3',
        'total_iva_amount' => 'decimal:3',
        'iibb' => 'decimal:3',
        'internal_tax' => 'decimal:3',
        'discount_value' => 'decimal:2',
        'discount_amount' => 'decimal:3',
        'total' => 'decimal:3',
        'paid_amount' => 'decimal:3',
        'cae_expiration_date' => 'date',
        'service_from_date' => 'date',
        'service_to_date' => 'date',
        'service_due_date' => 'date',
        'approved_at' => 'datetime',
        'annulled_at' => 'datetime',
        'metadata' => 'array',
    ];

    protected $appends = ['pending_amount'];

    public function receiptType()
    {
        return $this->belongsTo(ReceiptType::class, 'receipt_type_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function annulledByUser()
    {
        return $this->belongsTo(User::class, 'annulled_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function saleFiscalCondition()
    {
        return $this->belongsTo(FiscalCondition::class, 'sale_fiscal_condition_id');
    }

    public function saleDocumentType()
    {
        return $this->belongsTo(DocumentType::class, 'sale_document_type_id');
    }

    // Relación con los ítems de la venta
    public function items()
    {
        return $this->hasMany(SaleItem::class, 'sale_header_id');
    }

    // Relación con los totales de IVA de la venta
    public function saleIvas()
    {
        return $this->hasMany(SaleIva::class, 'sale_header_id');
    }

    // Relación con los pagos de la venta
    public function salePayments()
    {
        return $this->hasMany(SalePayment::class, 'sale_header_id');
    }

    public function paymentType()
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    // Relación con movimientos de caja
    public function cashMovements()
    {
        return $this->hasMany(CashMovement::class, 'reference_id')
            ->where('reference_type', 'sale');
    }

    // Relación con movimientos de cuenta corriente
    public function currentAccountMovements()
    {
        return $this->hasMany(CurrentAccountMovement::class, 'sale_id');
    }

    /**
     * Accessor para monto pendiente
     */
    public function getPendingAmountAttribute(): float
    {
        $total = (float) ($this->total ?? 0);
        $paid = (float) ($this->paid_amount ?? 0);
        return max(0, $total - $paid);
    }

    /**
     * Registrar pago en la venta
     */
    public function recordPayment(float $amount): void
    {
        $this->paid_amount = (float) $this->paid_amount + $amount;

        if ($this->paid_amount >= $this->total) {
            $this->payment_status = 'paid';
            $this->paid_amount = $this->total;
        } elseif ($this->paid_amount > 0) {
            $this->payment_status = 'partial';
        }

        $this->save();
    }

    /**
     * Get the shipments associated with this sale.
     */
    public function shipments()
    {
        return $this->belongsToMany(Shipment::class, 'shipment_sale');
    }

    /**
     * Scope para filtrar ventas pendientes de aprobación
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope para filtrar ventas aprobadas
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope para filtrar ventas rechazadas
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'date',
                'receipt_type_id',
                'branch_id',
                'receipt_number',
                'customer_id',
                'sale_fiscal_condition_id',
                'sale_document_type_id',
                'sale_document_number',
                'subtotal',
                'total_iva_amount',
                'iibb',
                'internal_tax',
                'discount_type',
                'discount_value',
                'discount_amount',
                'total',
                'cae',
                'cae_expiration_date',
                'service_from_date',
                'service_to_date',
                'service_due_date',
                'user_id',
                'status',
                'approved_by',
                'approved_at',
                'rejection_reason',
                'annulled_at',
                'annulled_by',
                'annulment_reason',
                'paid_amount',
                'payment_status'
            ])
            ->useLogName('sale')
            ->logOnlyDirty();
    }
}
