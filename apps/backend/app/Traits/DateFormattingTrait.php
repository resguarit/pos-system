<?php

declare(strict_types=1);

namespace App\Traits;

use Carbon\Carbon;

trait DateFormattingTrait
{
    /**
     * Format a date for API response (ISO format).
     */
    protected function formatDateForApi(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d H:i:s');
    }

    /**
     * Format a date for display (localized format).
     */
    protected function formatDateForDisplay(?Carbon $date): ?string
    {
        return $date?->format('d/m/Y H:i');
    }

    /**
     * Format a date for display (date only).
     */
    protected function formatDateOnly(?Carbon $date): ?string
    {
        return $date?->format('d/m/Y');
    }

    /**
     * Format a date for display (time only).
     */
    protected function formatTimeOnly(?Carbon $date): ?string
    {
        return $date?->format('H:i');
    }

    /**
     * Format a date for display (relative time).
     */
    protected function formatRelativeTime(?Carbon $date): ?string
    {
        return $date?->diffForHumans();
    }

    /**
     * Format a date for display (long format).
     */
    protected function formatLongDate(?Carbon $date): ?string
    {
        return $date?->format('l, F j, Y \a\t g:i A');
    }

    /**
     * Format a date for display (short format).
     */
    protected function formatShortDate(?Carbon $date): ?string
    {
        return $date?->format('M j, Y');
    }

    /**
     * Format a date for display (compact format).
     */
    protected function formatCompactDate(?Carbon $date): ?string
    {
        return $date?->format('m/d/Y');
    }

    /**
     * Format a date for display (ISO date only).
     */
    protected function formatIsoDate(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d');
    }

    /**
     * Format a date for display (ISO datetime).
     */
    protected function formatIsoDateTime(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d\TH:i:s\Z');
    }

    /**
     * Format a date for display (timestamp).
     */
    protected function formatTimestamp(?Carbon $date): ?int
    {
        return $date?->timestamp;
    }

    /**
     * Format a date for display (human readable).
     */
    protected function formatHumanReadable(?Carbon $date): ?string
    {
        return $date?->format('j F Y \a \l\a\s g:i A');
    }

    /**
     * Format a date for display (business format).
     */
    protected function formatBusinessDate(?Carbon $date): ?string
    {
        return $date?->format('d/m/Y H:i');
    }

    /**
     * Format a date for display (calendar format).
     */
    protected function formatCalendarDate(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d H:i:s');
    }

    /**
     * Format a date for display (user friendly).
     */
    protected function formatUserFriendlyDate(?Carbon $date): ?string
    {
        return $date?->format('d de F de Y \a \l\a\s H:i');
    }

    /**
     * Format a date for display (system format).
     */
    protected function formatSystemDate(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d H:i:s');
    }

    /**
     * Format a date for display (export format).
     */
    protected function formatExportDate(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d H:i:s');
    }

    /**
     * Format a date for display (log format).
     */
    protected function formatLogDate(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d H:i:s');
    }

    /**
     * Format a date for display (database format).
     */
    protected function formatDatabaseDate(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d H:i:s');
    }

    /**
     * Format a date for display (API format).
     */
    protected function formatApiDate(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d H:i:s');
    }

    /**
     * Format a date for display (frontend format).
     */
    protected function formatFrontendDate(?Carbon $date): ?string
    {
        return $date?->format('d/m/Y H:i');
    }

    /**
     * Format a date for display (backend format).
     */
    protected function formatBackendDate(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d H:i:s');
    }

    /**
     * Format a date for display (default format).
     */
    protected function formatDefaultDate(?Carbon $date): ?string
    {
        return $date?->format('Y-m-d H:i:s');
    }

    /**
     * Format a date for display (custom format).
     */
    protected function formatCustomDate(?Carbon $date, string $format): ?string
    {
        return $date?->format($format);
    }

    /**
     * Format a date for display (multiple formats).
     */
    protected function formatMultipleDates(?Carbon $date): array
    {
        if (!$date) {
            return [
                'api' => null,
                'display' => null,
                'iso' => null,
                'timestamp' => null,
                'relative' => null,
            ];
        }

        return [
            'api' => $this->formatApiDate($date),
            'display' => $this->formatDateForDisplay($date),
            'iso' => $this->formatIsoDateTime($date),
            'timestamp' => $this->formatTimestamp($date),
            'relative' => $this->formatRelativeTime($date),
        ];
    }
}



