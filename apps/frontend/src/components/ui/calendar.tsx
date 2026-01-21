import "cally";
import React, { useEffect, useRef, useMemo } from "react";
import type { CalendarDate, CalendarRange, CalendarMonth } from "cally";
import { format, parse, isValid, startOfDay, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Add TypeScript definitions for cally web components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "calendar-date": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          value?: string;
          min?: string;
          max?: string;
          locale?: string;
          firstDayOfWeek?: number;
          showOutsideDays?: boolean;
          isDateDisallowed?: (date: Date) => boolean;
        },
        HTMLElement
      > & { ref?: React.RefObject<CalendarDate> };
      "calendar-range": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          value?: string;
          min?: string;
          max?: string;
          locale?: string;
          firstDayOfWeek?: number;
          showOutsideDays?: boolean;
          isDateDisallowed?: (date: Date) => boolean;
        },
        HTMLElement
      > & { ref?: React.RefObject<CalendarRange> };
      "calendar-month": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { ref?: React.RefObject<CalendarMonth> };
    }
  }
}

export type CalendarProps = {
  className?: string;
  classNames?: Record<string, string>;
  selected?: Date | Date[] | { from: Date; to?: Date } | null;
  onSelect?: (date: any) => void;
  onDayClick?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  defaultMonth?: Date;
  showOutsideDays?: boolean;
  mode?: "single" | "multiple" | "range";
  initialFocus?: boolean;
  fromDate?: Date;
  toDate?: Date;
  months?: number; // Added to support showing multiple months
};

function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseDate(dateStr: string): Date {
  return parse(dateStr, "yyyy-MM-dd", new Date());
}

import { usePrimaryColor } from "@/hooks/usePrimaryColor";

export function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  mode = "single",
  defaultMonth,
  showOutsideDays = true,
  fromDate,
  toDate,
  months = 1,
}: CalendarProps) {
  const ref = useRef<CalendarDate | CalendarRange>(null);
  const primaryColor = usePrimaryColor();

  // Convert external 'selected' prop (Date objects) to internal string value for Cally
  const internalValue = useMemo(() => {
    if (!selected) return "";

    if (mode === "range" && typeof selected === "object" && "from" in selected) {
      const from = selected.from instanceof Date && isValid(selected.from) ? formatDate(selected.from) : "";
      const to = selected.to instanceof Date && isValid(selected.to) ? formatDate(selected.to) : "";
      return from && to ? `${from}/${to}` : from;
    }

    if (mode === "single" && selected instanceof Date && isValid(selected)) {
      return formatDate(selected);
    }

    // TODO: Support multiple dates if needed (Cally 'multiple' mode uses space-separated strings)
    if (mode === "multiple" && Array.isArray(selected)) {
      return selected.map(d => formatDate(d)).join(" ");
    }

    return "";
  }, [selected, mode]);

  // Handle value changes from Cally
  const handleChange = (e: Event) => {
    if (!onSelect) return;
    const target = e.target as CalendarDate | CalendarRange;
    const value = target.value;

    if (mode === "range") {
      // value is "YYYY-MM-DD/YYYY-MM-DD" or "YYYY-MM-DD"
      const [start, end] = value.split("/");
      const from = start ? parseDate(start) : undefined;
      const to = end ? parseDate(end) : undefined;

      // Only fire if we have at least a start date
      if (from) {
        onSelect({ from, to });
      } else {
        onSelect(undefined);
      }
    } else if (mode === "single") {
      const date = value ? parseDate(value) : undefined;
      onSelect(date);
    } else if (mode === "multiple") {
      const dates = value ? value.split(" ").map(parseDate) : [];
      onSelect(dates);
    }
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener("change", handleChange);
    return () => {
      element.removeEventListener("change", handleChange);
    };
  }, [onSelect, mode]);

  // Sync value to ref if it changes
  useEffect(() => {
    if (ref.current && ref.current.value !== internalValue) {
      ref.current.value = internalValue;
    }
  }, [internalValue]);

  const CalendarComponent = mode === "range" ? "calendar-range" : "calendar-date";
  // Check if mode is 'multiple' differently because cally supports it on calendar-date via boolean attribute, 
  // but React props might be tricky. Actually cally's calendar-date has 'multiple' attribute.

  // Custom disallowed date function
  const isDateDisallowed = (date: Date) => {
    if (disabled) return disabled(date);
    return false;
  };

  // Determine accent color style
  const accentColor = primaryColor;

  return (
    <div
      className={cn(
        "p-3 bg-white dark:bg-gray-900 rounded-lg border shadow-sm w-fit inline-block",
        className
      )}
    >
      <style>{`
        calendar-date, calendar-range {
          display: inline-block;
          width: 100%;
        }
        
        .cally-months-container {
            display: flex;
            gap: 1.5rem;
            flex-wrap: wrap;
            justify-content: center;
        }
      `}</style>

      {/* @ts-ignore */}
      <CalendarComponent
        ref={ref as any}
        value={internalValue}
        min={fromDate ? formatDate(fromDate) : undefined}
        max={toDate ? formatDate(toDate) : undefined}
        locale="es-AR"
        firstDayOfWeek={1}
        showOutsideDays={showOutsideDays}
        isDateDisallowed={isDateDisallowed}
        class="block"
        style={{
          "--color-accent": accentColor,
          "--color-text-on-accent": "#ffffff",
        } as React.CSSProperties}
      >
        {/* Navigation Buttons must be direct children to be slotted correctly */}
        <button slot="previous" className="p-2 hover:bg-accent rounded-md cursor-pointer text-foreground inline-flex items-center justify-center">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button slot="next" className="p-2 hover:bg-accent rounded-md cursor-pointer text-foreground inline-flex items-center justify-center">
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="cally-months-container mt-2">
          {Array.from({ length: months }).map((_, i) => (
            <calendar-month key={i} offset={i}></calendar-month>
          ))}
        </div>
      </CalendarComponent>
    </div>
  );
}

Calendar.displayName = "Calendar";
