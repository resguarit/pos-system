<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\ExpenseReminder;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ExpenseReminderService
{
    /**
     * Intervalos de recurrencia soportados
     */
    private const RECURRENCE_INTERVALS = [
        'daily' => 'day',
        'weekly' => 'week',
        'biweekly' => '2 weeks',
        'monthly' => 'month',
        'quarterly' => '3 months',
        'biannual' => '6 months',
        'yearly' => 'year',
        'annual' => 'year',
    ];

    /**
     * Crear recordatorio inicial para un gasto recurrente
     */
    public function createReminderForExpense(Expense $expense): ?ExpenseReminder
    {
        if (!$expense->is_recurring || !$expense->recurrence_interval) {
            return null;
        }

        $nextDueDate = $this->calculateNextDueDate($expense->date, $expense->recurrence_interval);
        // Evita duplicados (hay unique en expense_id/next_due_date)
        return ExpenseReminder::firstOrCreate([
            'expense_id' => $expense->id,
            'next_due_date' => $nextDueDate,
        ], [
            'user_id' => $expense->user_id,
            'status' => 'pending',
        ]);
    }

    /**
     * Calcular la próxima fecha vencida basándose en la recurrencia
     */
    public function calculateNextDueDate(Carbon|string $currentDate, string $interval): Carbon
    {
        $date = $currentDate instanceof Carbon 
            ? $currentDate->copy() 
            : Carbon::parse($currentDate);

        $periodKey = strtolower($interval);

        if (!isset(self::RECURRENCE_INTERVALS[$periodKey])) {
            Log::warning("Intervalo de recurrencia desconocido: {$interval}");
            return $date->addMonth();
        }

        $period = self::RECURRENCE_INTERVALS[$periodKey];

        // Usar addDays/addWeeks/addMonths según el período
        if (str_contains($period, 'week')) {
            $weeks = (int) explode(' ', $period)[0];
            return $date->addWeeks($weeks);
        } elseif (str_contains($period, 'month')) {
            if ($period === '3 months') {
                return $date->addMonths(3);
            } elseif ($period === '6 months') {
                return $date->addMonths(6);
            }
            return $date->addMonth();
        } elseif ($period === 'year') {
            return $date->addYear();
        } else {
            $days = (int) explode(' ', $period)[0];
            return $date->addDays($days);
        }
    }

    /**
     * Procesar recordatorios pendientes (ejecutar diariamente vía scheduler)
     */
    public function processPendingReminders(): array
    {
        $reminders = ExpenseReminder::with('expense', 'user')
            ->pending()
            ->orderBy('id')
            ->get();

        $processed = [
            'sent' => 0,
            'failed' => 0,
            'skipped' => 0,
        ];

        foreach ($reminders as $reminder) {
            try {
                // Validar que el gasto siga siendo válido y recurrente
                if (!$reminder->expense->is_recurring) {
                    $reminder->update(['status' => 'dismissed']);
                    $processed['skipped']++;
                    continue;
                }

                // Crear nuevo gasto pendiente automáticamente
                $this->createRecurringExpense($reminder);

                // Marcar como enviado
                $reminder->update([
                    'status' => 'sent',
                    'notified_at' => now(),
                ]);

                // Crear próximo recordatorio
                $nextDueDate = $this->calculateNextDueDate(
                    $reminder->next_due_date,
                    $reminder->expense->recurrence_interval
                );

                ExpenseReminder::firstOrCreate([
                    'expense_id' => $reminder->expense_id,
                    'next_due_date' => $nextDueDate,
                ], [
                    'user_id' => $reminder->user_id,
                    'status' => 'pending',
                ]);

                $processed['sent']++;
            } catch (\Exception $e) {
                Log::error("Error procesando recordatorio de gasto {$reminder->id}: {$e->getMessage()}");
                $processed['failed']++;
            }
        }

        return $processed;
    }

    /**
     * Crear gasto recurrente automáticamente
     */
    private function createRecurringExpense(ExpenseReminder $reminder): Expense
    {
        $originalExpense = $reminder->expense;

        // Crear nuevo gasto basado en el original
        $newExpense = DB::transaction(function () use ($originalExpense, $reminder) {
            return Expense::create([
                'branch_id' => $originalExpense->branch_id,
                'category_id' => $originalExpense->category_id,
                'employee_id' => $originalExpense->employee_id,
                'user_id' => $originalExpense->user_id,
                'description' => $originalExpense->description,
                'amount' => $originalExpense->amount,
                'date' => $reminder->next_due_date,
                'due_date' => $reminder->next_due_date,
                'status' => 'pending',
                'is_recurring' => false, // El nuevo gasto no es recurrente
                'recurrence_interval' => null,
            ]);
        });

        Log::info("Gasto recurrente creado automáticamente", [
            'original_expense_id' => $originalExpense->id,
            'new_expense_id' => $newExpense->id,
            'date' => $reminder->next_due_date,
        ]);

        return $newExpense;
    }

    /**
     * Obtener recordatorios pendientes para un usuario
     */
    public function getUserPendingReminders(int $userId)
    {
        return ExpenseReminder::with('expense.category')
            ->where('user_id', $userId)
            ->where('status', 'pending')
            ->orderBy('next_due_date', 'asc')
            ->get();
    }

    /**
     * Descartar un recordatorio
     */
    public function dismissReminder(int $reminderId): ExpenseReminder
    {
        $reminder = ExpenseReminder::findOrFail($reminderId);
        $reminder->update(['status' => 'dismissed']);
        return $reminder;
    }

    /**
     * Obtener estadísticas de recordatorios
     */
    public function getReminderStats(?int $userId = null): array
    {
        $base = ExpenseReminder::query();

        if ($userId) {
            $base->where('user_id', $userId);
        }

        return [
            'pending' => (clone $base)->where('status', 'pending')->count(),
            'sent_today' => (clone $base)->where('status', 'sent')
                ->whereDate('notified_at', today())
                ->count(),
            'overdue' => (clone $base)->where('status', 'pending')
                ->whereDate('next_due_date', '<', today())
                ->count(),
        ];
    }
}
