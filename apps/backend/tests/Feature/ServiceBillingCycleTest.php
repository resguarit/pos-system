<?php

namespace Tests\Feature;

use Tests\TestCase;
use Carbon\Carbon;

class ServiceBillingCycleTest extends TestCase
{
    /**
     * Test the calculation of the next due date for biennial billing cycle.
     */
    public function test_calculate_next_due_date_biennial()
    {
        $fromDate = Carbon::parse('2024-01-01');

        $controller = new \App\Http\Controllers\Api\ClientServiceController();
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('calculateNextDueDate');
        $method->setAccessible(true);

        // Test Biennial
        $nextDueDate = $method->invoke($controller, $fromDate, 'biennial');
        $this->assertEquals('2026-01-01', $nextDueDate->format('Y-m-d'));

        // Test Annual (reference)
        $nextDueDateAnnual = $method->invoke($controller, $fromDate, 'annual');
        $this->assertEquals('2025-01-01', $nextDueDateAnnual->format('Y-m-d'));

        // Test Quarterly
        $nextDueDateQuarterly = $method->invoke($controller, $fromDate, 'quarterly');
        $this->assertEquals('2024-04-01', $nextDueDateQuarterly->format('Y-m-d'));

        // Test Monthly
        $nextDueDateMonthly = $method->invoke($controller, $fromDate, 'monthly');
        $this->assertEquals('2024-02-01', $nextDueDateMonthly->format('Y-m-d'));

        // Test One Time
        $nextDueDateOneTime = $method->invoke($controller, $fromDate, 'one_time');
        $this->assertNull($nextDueDateOneTime);
    }
}
