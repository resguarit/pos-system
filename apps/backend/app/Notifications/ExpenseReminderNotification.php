<?php

namespace App\Notifications;

use App\Models\ExpenseReminder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ExpenseReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public ExpenseReminder $reminder)
    {
    }

    public function via(object $notifiable): array
    {
        // Usa base de datos; se puede agregar 'mail' si se configura correo
        return ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Recordatorio de gasto')
            ->line('Tienes un gasto recurrente próximo a vencer:')
            ->line('Descripción: ' . $this->reminder->expense->description)
            ->line('Monto: ' . $this->reminder->expense->amount)
            ->line('Fecha: ' . $this->reminder->next_due_date->toDateString())
            ->action('Ver gasto', url('/'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'reminder_id' => $this->reminder->id,
            'expense_id' => $this->reminder->expense_id,
            'description' => $this->reminder->expense?->description,
            'amount' => $this->reminder->expense?->amount,
            'next_due_date' => $this->reminder->next_due_date?->toDateString(),
            'status' => $this->reminder->status,
        ];
    }
}
