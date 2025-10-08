<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CashRegister extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'user_id',
        'opened_at',
        'closed_at',
        'initial_amount',
        'final_amount',
        'expected_cash_balance',
        'cash_difference',
        'payment_method_totals',
        'status',
        'notes',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'initial_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'expected_cash_balance' => 'decimal:2',
        'cash_difference' => 'decimal:2',
        'payment_method_totals' => 'array',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cashMovements()
    {
        return $this->hasMany(CashMovement::class);
    }

    public function calculateExpectedBalance()
    {
        $totalMovements = $this->cashMovements()
            ->join('movement_types', 'cash_movements.movement_type_id', '=', 'movement_types.id')
            ->where('movement_types.is_cash_movement', true)
            ->sum(DB::raw('CASE 
                WHEN movement_types.operation_type = "entrada" THEN cash_movements.amount 
                WHEN movement_types.operation_type = "salida" THEN -cash_movements.amount 
                ELSE 0 END'));
        
        return $this->initial_amount + $totalMovements;
    }

    /**
     * Calcular el saldo esperado en efectivo (excluyendo movimientos automáticos del sistema)
     */
    public function calculateExpectedCashBalance()
    {
        // Si ya está calculado y guardado, devolverlo
        if ($this->expected_cash_balance !== null) {
            return $this->expected_cash_balance;
        }

        // Obtener métodos de pago que son efectivo
        $cashPaymentMethods = $this->getCashPaymentMethods();
        
        // Calcular movimientos que afectan el efectivo físico de la caja
        $cashMovements = $this->cashMovements()
            ->join('movement_types', 'cash_movements.movement_type_id', '=', 'movement_types.id')
            ->where('movement_types.is_cash_movement', true)
            // Excluir movimientos automáticos del sistema
            ->whereNotIn('movement_types.name', ['Apertura automática', 'Cierre automático', 'Ajuste del sistema'])
            ->where(function ($query) use ($cashPaymentMethods) {
                return $query->where(function ($q) use ($cashPaymentMethods) {
                    // Para ENTRADAS: solo incluir si el método de pago es efectivo
                    $q->where('movement_types.operation_type', 'entrada')
                      ->when($cashPaymentMethods->isNotEmpty(), function ($subQuery) use ($cashPaymentMethods) {
                          return $subQuery->where(function ($subQ) use ($cashPaymentMethods) {
                              $subQ->whereIn('cash_movements.payment_method_id', $cashPaymentMethods->pluck('id'))
                                   ->orWhereNull('cash_movements.payment_method_id');
                          });
                      });
                })->orWhere(function ($q) use ($cashPaymentMethods) {
                    // Para SALIDAS: solo incluir si el método de pago es efectivo
                    // porque solo estos afectan el efectivo físico de la caja
                    $q->where('movement_types.operation_type', 'salida')
                      ->when($cashPaymentMethods->isNotEmpty(), function ($subQuery) use ($cashPaymentMethods) {
                          return $subQuery->where(function ($subQ) use ($cashPaymentMethods) {
                              $subQ->whereIn('cash_movements.payment_method_id', $cashPaymentMethods->pluck('id'))
                                   ->orWhereNull('cash_movements.payment_method_id');
                          });
                      });
                });
            })
            ->sum(DB::raw('CASE 
                WHEN movement_types.operation_type = "entrada" THEN cash_movements.amount 
                WHEN movement_types.operation_type = "salida" THEN -cash_movements.amount 
                ELSE 0 END'));

        return $this->initial_amount + $cashMovements;
    }

    /**
     * Calcular totales por método de pago
     */
    public function calculatePaymentMethodTotals()
    {
        if ($this->payment_method_totals !== null) {
            return $this->payment_method_totals;
        }

        $totals = $this->cashMovements()
            ->join('movement_types', 'cash_movements.movement_type_id', '=', 'movement_types.id')
            ->join('payment_methods', 'cash_movements.payment_method_id', '=', 'payment_methods.id')
            // Eliminar filtro is_cash_movement para incluir todos los métodos de pago
            ->whereNotIn('movement_types.name', ['Apertura automática', 'Cierre automática', 'Ajuste del sistema'])
            ->select([
                'payment_methods.name as payment_method',
                DB::raw('SUM(CASE 
                    WHEN movement_types.operation_type = "entrada" THEN cash_movements.amount 
                    WHEN movement_types.operation_type = "salida" THEN -cash_movements.amount 
                    ELSE 0 END) as total')
            ])
            ->groupBy('payment_methods.id', 'payment_methods.name')
            ->get()
            ->pluck('total', 'payment_method')
            ->toArray();

        // Agregar el saldo inicial al método de pago de efectivo
        if ($this->initial_amount > 0) {
            $cashPaymentMethods = $this->getCashPaymentMethods();
            foreach ($cashPaymentMethods as $cashMethod) {
                if (isset($totals[$cashMethod->name])) {
                    $totals[$cashMethod->name] += $this->initial_amount;
                } else {
                    $totals[$cashMethod->name] = $this->initial_amount;
                }
            }
        }

        return $totals;
    }

    /**
     * Obtener métodos de pago que son considerados efectivo
     */
    private function getCashPaymentMethods()
    {
        // Palabras clave para identificar métodos de pago en efectivo
        $cashKeywords = ['efectivo', 'cash', 'contado'];
        
        return \App\Models\PaymentMethod::where('is_active', true)
            ->where(function ($query) use ($cashKeywords) {
                foreach ($cashKeywords as $keyword) {
                    $query->orWhere('name', 'LIKE', "%{$keyword}%");
                }
            })
            ->get();
    }

    /**
     * Actualizar campos calculados
     * Recalcula y actualiza los campos calculados de la caja desde cero.
     * Esta es la función clave que solucionará el problema de inconsistencia.
     */
    public function updateCalculatedFields()
    {
        // Forzamos que la instancia del modelo se actualice con los datos más recientes de la BD
        // antes de hacer los cálculos, por si acaso.
        $this->refresh();

        // Obtenemos todos los movimientos con sus relaciones para no hacer consultas de más (N+1)
        $movements = $this->cashMovements()->with(['movementType', 'paymentMethod'])->get();

        $paymentTotals = [];
        // Empezamos el cálculo del efectivo esperado con el monto inicial de la caja
        $expectedCash = $this->initial_amount;

        // Iteramos sobre cada movimiento para hacer los cálculos
        foreach ($movements as $movement) {
            // CRÍTICO: Solo procesar movimientos que afectan el balance
            if (!$movement->affects_balance) {
                continue; // Saltar movimientos informativos
            }
            
            // Determinamos si el monto es positivo (ingreso) o negativo (egreso)
            // basándonos en el operation_type del MovementType.
            $amount = ($movement->movementType->operation_type === 'entrada')
                ? $movement->amount
                : -$movement->amount;

            // Obtenemos el nombre del método de pago. Si no tiene, usamos una categoría genérica.
            $paymentMethodName = $movement->paymentMethod->name ?? 'Indefinido';

            // Inicializamos el total para este método de pago si aún no existe
            if (!isset($paymentTotals[$paymentMethodName])) {
                $paymentTotals[$paymentMethodName] = 0;
            }

            // Sumamos (o restamos) el monto al total del método de pago correspondiente
            $paymentTotals[$paymentMethodName] += $amount;
            
            // Si el método de pago es 'Efectivo', actualizamos el balance de efectivo esperado
            // Es importante que el nombre coincida exactamente.
            if (strtolower($paymentMethodName) === 'efectivo') {
                $expectedCash += $amount;
            }
        }
        
        // Calculamos la diferencia de efectivo si hay un monto final registrado
        $cashDifference = $this->final_amount !== null 
            ? ($this->final_amount - $expectedCash) 
            : null;
        
        // Asignamos los nuevos valores calculados a las propiedades del modelo
        $this->payment_method_totals = $paymentTotals;
        $this->expected_cash_balance = $expectedCash;
        $this->cash_difference = $cashDifference;

        // Guardamos los cambios en la base de datos sin disparar otros eventos
        $this->saveQuietly();
    }

    public function isOpen()
    {
        return $this->status === 'open';
    }
}
