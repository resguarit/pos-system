import { useState, useEffect, useMemo, useCallback } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isAfter, isBefore, addYears, differenceInCalendarMonths, differenceInCalendarDays, differenceInCalendarYears } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { expensesService } from "@/lib/api/expensesService";

interface Expense {
    id: number;
    description: string;
    amount: number;
    date: string;
    due_date?: string | null;
    category_id: number;
    employee_id?: number | null;
    branch_id: number;
    status: string;
    is_recurring: boolean;
    recurrence_interval?: string | null;
    category?: Record<string, unknown>;
    deleted_at?: string | null;
}

interface ExpenseCalendarProps {
    onDateSelect?: (date: Date) => void;
    filters?: {
        branch_id?: string | number;
        status?: string;
    };
}

export default function ExpenseCalendar({ onDateSelect, filters }: ExpenseCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Memoize date range so object identity stays stable between renders,
    // preventing useCallback/useMemo from invalidating on every render cycle.
    const { startDate, endDate, calendarDays } = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const start = startOfWeek(monthStart, { weekStartsOn: 1 });
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return {
            startDate: start,
            endDate: end,
            calendarDays: eachDayOfInterval({ start, end }),
        };
    }, [currentMonth]);

    const loadExpenses = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string | number> = {
                limit: 1000,
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
            };

            if (filters) {
                if (filters.branch_id !== 'all' && filters.branch_id != null) {
                    params.branch_id = filters.branch_id;
                }
                if (filters.status && filters.status !== 'all') {
                    params.status = filters.status;
                }
            }

            const data = await expensesService.getExpenses(params);
            setExpenses(data.data || []);
        } catch (error) {
            console.error("Error loading expenses for calendar:", error);
        } finally {
            setIsLoading(false);
        }
    }, [filters, startDate, endDate]);

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

    // Generate instances for each day in the current view
    const calendarEvents = useMemo(() => {
        const eventsMap = new Map<string, Expense[]>();

        calendarDays.forEach(day => {
            eventsMap.set(format(day, 'yyyy-MM-dd'), []);
        });

        expenses
            .filter(exp => !exp.deleted_at && exp.status !== 'cancelled')
            .forEach(exp => {
                if (!exp.date) return;
                const expStartDate = parseISO(exp.date);
                const expDateOnly = exp.date.split('T')[0];

                // 1. Always show the actual expense record on its original date
                if (eventsMap.has(expDateOnly)) {
                    eventsMap.get(expDateOnly)!.push(exp);
                }

                // 2. Project future occurrences only for recurring unpaid expenses
                if (exp.is_recurring && exp.status !== 'paid') {
                    if (isAfter(expStartDate, endDate)) return;

                    calendarDays.forEach((calDay) => {
                        if (isBefore(calDay, expStartDate) || isSameDay(calDay, expStartDate)) return;

                        const dateStr = format(calDay, 'yyyy-MM-dd');
                        let occursOnThisDay = false;

                        switch (exp.recurrence_interval) {
                            case 'daily':
                                occursOnThisDay = true;
                                break;
                            case 'weekly':
                                occursOnThisDay = differenceInCalendarDays(calDay, expStartDate) % 7 === 0;
                                break;
                            case 'monthly': {
                                const expected = addMonths(expStartDate, differenceInCalendarMonths(calDay, expStartDate));
                                occursOnThisDay = isSameDay(calDay, expected);
                                break;
                            }
                            case 'yearly': {
                                const expected = addYears(expStartDate, differenceInCalendarYears(calDay, expStartDate));
                                occursOnThisDay = isSameDay(calDay, expected);
                                break;
                            }
                        }

                        if (occursOnThisDay) {
                            eventsMap.get(dateStr)!.push(exp);
                        }
                    });
                }
            });

        return eventsMap;
    }, [expenses, calendarDays, endDate]);

    const getDayStatusHighlight = (dayEvents: Expense[]) => {
        if (!dayEvents.length || isLoading) return null;

        let hasPaid = false;
        let hasPending = false;
        let hasOverdue = false;

        const today = new Date();

        dayEvents.forEach(exp => {
            if (exp.status === 'paid') {
                hasPaid = true;
            } else if (exp.status === 'pending') {
                if (exp.due_date && new Date(exp.due_date) < today) {
                    hasOverdue = true;
                } else {
                    hasPending = true;
                }
            } else {
                hasPending = true;
            }
        });

        if (hasOverdue) return 'bg-red-500 text-white font-bold';
        if (hasPending) return 'bg-yellow-500 text-white font-bold';
        if (hasPaid) return 'bg-green-500 text-white font-bold';

        return null;
    };

    const handleDayClick = (day: Date) => {
        if (onDateSelect) {
            onDateSelect(day);
        }
    };

    return (
        <Card className="w-full flex-shrink-0">
            <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </CardTitle>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-3">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
                    {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(day => (
                        <div key={day}>{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayEvents = calendarEvents.get(dateStr) || [];
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isToday = isSameDay(day, new Date());
                        const statusHighlight = getDayStatusHighlight(dayEvents);

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => handleDayClick(day)}
                                className={`
                                    flex flex-col items-center justify-center h-10 w-full rounded-md text-sm transition-colors cursor-pointer
                                    ${!isCurrentMonth ? 'text-muted-foreground/30 hover:bg-muted/50' : 'hover:bg-accent hover:text-accent-foreground'}
                                `}
                            >
                                <span className={`
                                    flex items-center justify-center w-7 h-7 rounded-full transition-all
                                    ${statusHighlight ? statusHighlight : isToday ? 'bg-primary/20 text-primary font-bold border-2 border-primary' : ''}
                                `}>
                                    {format(day, 'd')}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
