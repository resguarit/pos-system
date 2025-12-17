<?php

namespace App\Http\Controllers;

use App\Models\ExpenseReminder;
use App\Services\ExpenseReminderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ExpenseReminderController extends Controller
{
    protected ExpenseReminderService $reminderService;

    public function __construct(ExpenseReminderService $reminderService)
    {
        $this->reminderService = $reminderService;
    }

    /**
     * Get pending reminders for the authenticated user
     */
    public function pending(Request $request)
    {
        try {
            $userId = Auth::id();
            $reminders = $this->reminderService->getUserPendingReminders($userId);

            return response()->json([
                'success' => true,
                'data' => $reminders,
                'count' => $reminders->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark a reminder as dismissed
     */
    public function dismiss(ExpenseReminder $expenseReminder)
    {
        try {
            // Authorization check - user can only dismiss their own reminders
            if ($expenseReminder->user_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $this->reminderService->dismissReminder($expenseReminder->id);

            return response()->json([
                'success' => true,
                'message' => 'Reminder dismissed successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get reminder statistics for the authenticated user
     */
    public function stats(Request $request)
    {
        try {
            $userId = Auth::id();
            $stats = $this->reminderService->getReminderStats($userId);

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all reminders for the authenticated user (including sent and dismissed)
     */
    public function index(Request $request)
    {
        try {
            $userId = Auth::id();
            $status = $request->get('status', 'pending'); // 'pending', 'sent', 'dismissed', or 'all'

            $query = ExpenseReminder::where('user_id', $userId)
                ->with(['expense.category', 'expense.branch'])
                ->latest('next_due_date');

            if ($status !== 'all') {
                $query->where('status', $status);
            }

            $reminders = $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $reminders->items(),
                'current_page' => $reminders->currentPage(),
                'last_page' => $reminders->lastPage(),
                'per_page' => $reminders->perPage(),
                'total' => $reminders->total()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show details of a specific reminder
     */
    public function show(ExpenseReminder $expenseReminder)
    {
        try {
            // Authorization check
            if ($expenseReminder->user_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => $expenseReminder->load(['expense.category', 'expense.branch', 'user'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
