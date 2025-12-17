<?php

namespace App\Jobs;

use App\Services\ExpenseReminderService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessRecurringExpenseReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Ejecutar el job
     */
    public function handle(ExpenseReminderService $reminderService): void
    {
        Log::info('Iniciando procesamiento de recordatorios de gastos recurrentes');

        $results = $reminderService->processPendingReminders();

        Log::info('Recordatorios procesados', [
            'sent' => $results['sent'],
            'failed' => $results['failed'],
            'skipped' => $results['skipped'],
        ]);
    }
}
