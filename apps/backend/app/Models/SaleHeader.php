<?php

namespace App\Models;

use App\Constants\SaleNumberingScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\LogsActivityWithContext;

/**
 * @property int $id
 * @property \Carbon\Carbon $date
 * @property int $receipt_type_id
 * @property int $branch_id
 * @property string|null $receipt_number
 * @property string $numbering_scope
 * @property int|null $customer_id
 * @property string|null $subtotal
 * @property string|null $total_iva_amount
 * @property string|null $iibb
 * @property string|null $internal_tax
 * @property string|null $discount_amount
 * @property string $total
 * @property string|null $cae
 * @property \Carbon\Carbon|null $cae_expiration_date
 * @property string $status
 * @property int|null $original_sale_id
 * 
 * @property-read \App\Models\ReceiptType $receiptType
 * @property-read \App\Models\Branch $branch
 * @property-read \App\Models\Customer|null $customer
 * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\SaleItem[] $items
 * @property-read \App\Models\SaleHeader|null $originalSale
 * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\SaleHeader[] $creditNotes
 */
class SaleHeader extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, LogsActivityWithContext;

    protected $table = 'sales_header';

    protected $fillable = [
        'date',
        'receipt_type_id',
        'branch_id',
        'receipt_number',
        'numbering_scope',
        'customer_id',
        'customer_tax_identity_id',
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
        'converted_from_budget_id',
        'converted_to_sale_id',
        'original_sale_id',
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

    protected static function booted(): void
    {
        static::saving(function (SaleHeader $model) {
            if (array_key_exists('numbering_scope', $model->getDirty()) && $model->numbering_scope !== null) {
                if (!SaleNumberingScope::isValid($model->numbering_scope)) {
                    throw new \InvalidArgumentException(
                        'numbering_scope inválido: "' . $model->numbering_scope . '". Valores permitidos: ' . implode(', ', SaleNumberingScope::allowedValues())
                    );
                }
            }
        });
    }

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

    /** Identidad fiscal del cliente usada en esta venta (CUIT, razón social, condición IVA). */
    public function customerTaxIdentity()
    {
        return $this->belongsTo(CustomerTaxIdentity::class, 'customer_tax_identity_id');
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

    public function getSurchargeTotalAttribute(): float
    {
        // Si ya fue cargado con withSum, usar ese valor
        if (isset($this->attributes['surcharge_total'])) {
            return (float) $this->attributes['surcharge_total'];
        }

        return (float) $this->currentAccountMovements()
            ->whereHas('movementType', function ($q) {
                $q->where('name', 'Recargo');
            })
            ->sum('amount');
    }

    /**
     * Accessor para monto pendiente (Incluye recargos)
     */
    public function getPendingAmountAttribute(): float
    {
        $total = (float) ($this->total ?? 0);
        $surcharges = $this->getSurchargeTotalAttribute();
        $paid = (float) ($this->paid_amount ?? 0);
        $pending = ($total + $surcharges) - $paid;

        // Fix precision issues returning tiny debts
        return $pending < 0.01 ? 0 : $pending;
    }

    /**
     * Registrar pago en la venta
     */
    public function recordPayment(float $amount): void
    {
        // Debug log
        \Illuminate\Support\Facades\Log::info("SaleHeader::recordPayment [{$this->id}] {$this->receipt_number}", [
            'amount_adding' => $amount,
            'previous_paid' => $this->paid_amount,
            'total' => $this->total
        ]);

        $this->paid_amount = (float) $this->paid_amount + $amount;

        $epsilon = 0.01;
        $surchargeTotal = $this->getSurchargeTotalAttribute();
        $effectiveTotal = (float) $this->total + $surchargeTotal;

        if ($this->paid_amount >= ($effectiveTotal - $epsilon)) {
            $this->payment_status = 'paid';
            // Snap to total to avoid fractional drift
            if (abs($this->paid_amount - $effectiveTotal) < $epsilon) {
                $this->paid_amount = $effectiveTotal;
            }
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

    /**
     * Scope para ventas válidas para deuda (no rechazadas ni anuladas)
     */
    public function scopeValidForDebt($query)
    {
        return $query->whereNotIn('status', ['rejected', 'annulled']);
    }

    /**
     * Scope para ventas con deuda pendiente
     */
    public function scopePendingDebt($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('payment_status')
                ->orWhereIn('payment_status', ['pending', 'partial']);
        });
    }

    /**
     * Scope por alcance de numeración (venta vs presupuesto).
     */
    public function scopeWithNumberingScope($query, string $scope): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('numbering_scope', $scope);
    }

    /**
     * Indica si este registro usa la secuencia de presupuestos.
     */
    public function isNumberingScopePresupuesto(): bool
    {
        return $this->numbering_scope === SaleNumberingScope::PRESUPUESTO;
    }

    /**
     * Relación con la venta a la que se convirtió este presupuesto
     */
    public function convertedToSale()
    {
        return $this->belongsTo(SaleHeader::class, 'converted_to_sale_id');
    }

    /**
     * Relación con el presupuesto desde el cual se generó esta venta
     */
    public function convertedFromBudget()
    {
        return $this->belongsTo(SaleHeader::class, 'converted_from_budget_id');
    }

    /**
     * Relación con la venta original (para notas de crédito o débito)
     */
    public function originalSale()
    {
        return $this->belongsTo(SaleHeader::class, 'original_sale_id');
    }

    /**
     * Relación con las notas de crédito emitidas a partir de esta venta
     */
    public function creditNotes()
    {
        return $this->hasMany(SaleHeader::class, 'original_sale_id');
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
