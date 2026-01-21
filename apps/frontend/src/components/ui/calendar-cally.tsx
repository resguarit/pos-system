import "cally";
import React, { useEffect, useRef } from "react";
import type { CalendarDate, CalendarRange, CalendarMonth } from "cally";
import { cn } from "@/lib/utils";

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

export type CallyCalendarProps = {
    mode?: "single" | "range";
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
    min?: string;
    max?: string;
    locale?: string;
    showOutsideDays?: boolean;
};

export function CallyCalendar({
    mode = "single",
    value,
    onChange,
    className,
    min,
    max,
    locale = "es-AR", // Default to requested locale context or generic
    showOutsideDays = true,
}: CallyCalendarProps) {
    const ref = useRef<CalendarDate | CalendarRange>(null);

    // Handle value changes via event listener since React might not capture custom element triggers perfectly in all versions
    // although React 19 is better, robust handling is preferred.
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleChange = (e: Event) => {
            const target = e.target as CalendarDate | CalendarRange;
            if (onChange) {
                onChange(target.value);
            }
        };

        element.addEventListener("change", handleChange);
        return () => {
            element.removeEventListener("change", handleChange);
        };
    }, [onChange]);

    // Sync value prop if it changes externally
    useEffect(() => {
        if (ref.current && value !== undefined && ref.current.value !== value) {
            ref.current.value = value;
        }
    }, [value]);

    const CalendarComponent = mode === "range" ? "calendar-range" : "calendar-date";

    return (
        <div
            className={cn(
                "p-3 bg-white dark:bg-gray-900 rounded-lg border shadow-sm w-fit",
                "cally-theme-wrapper",
                className
            )}
        >
            <style>{`
        .cally-theme-wrapper {
          --color-accent: hsl(var(--primary));
          --color-text-on-accent: hsl(var(--primary-foreground));
          --color-text: hsl(var(--foreground));
          --color-hover: hsl(var(--accent));
          /* Add more custom mappings as needed */
        }
        
        /* Ensure calendar fits nicely */
        calendar-date, calendar-range {
          display: block;
        }

        calendar-month {
          --color-accent: hsl(var(--primary));
        }
      `}</style>

            {/* 
        // @ts-ignore - TS might complain about dynamic element type assignment in JSX 
      */}
            <CalendarComponent
                ref={ref as any}
                value={value}
                min={min}
                max={max}
                locale={locale}
                firstDayOfWeek={1} // Monday start
                showOutsideDays={showOutsideDays}
                class="block"
            >
                <div className="flex justify-between items-center mb-4">
                    <button slot="previous" className="p-2 hover:bg-accent rounded-md cursor-pointer text-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <calendar-month class="font-semibold text-lg text-foreground"></calendar-month>
                    <button slot="next" className="p-2 hover:bg-accent rounded-md cursor-pointer text-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                </div>
            </CalendarComponent>
        </div>
    );
}
