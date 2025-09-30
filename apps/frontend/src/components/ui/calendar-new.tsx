import * as React from "react";
import ReactCalendar from "react-calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { es } from "date-fns/locale";
import { format } from "date-fns";

import { cn } from "@/lib/utils";

// Importamos los estilos de react-calendar
import "react-calendar/dist/Calendar.css";

// Extendemos el tipo para que coincida con lo que espera la aplicación
export type CalendarProps = {
  className?: string;
  classNames?: Record<string, string>;
  selected?: Date | Date[] | { from: Date; to: Date };
  onSelect?: (date: Date | null) => void;
  onDayClick?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  defaultMonth?: Date;
  showOutsideDays?: boolean;
  mode?: "single" | "multiple" | "range";
  initialFocus?: boolean;
  fromDate?: Date;
  toDate?: Date;
  captionLayout?: "buttons" | "dropdown";
  modifiers?: Record<string, any>;
};

/**
 * Componente Calendar personalizado que utiliza react-calendar con soporte completo para español
 */
function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  mode = "single",
  defaultMonth,
}: CalendarProps) {
  // Convertir el formato seleccionado al formato que espera react-calendar
  const convertSelected = React.useMemo(() => {
    if (!selected) return undefined;
    
    if (mode === "range" && selected && typeof selected === "object" && "from" in selected) {
      return [selected.from, selected.to].filter(Boolean) as [Date, Date];
    }
    
    if (Array.isArray(selected)) {
      return selected;
    }
    
    return selected as Date;
  }, [selected, mode]);

  // Manejar el cambio de fecha según el modo
  const handleDateChange = (value: Date | Date[] | [Date, Date]) => {
    if (!onSelect) return;
    
    if (mode === "range") {
      if (Array.isArray(value) && value.length === 2) {
        onSelect({ from: value[0], to: value[1] } as any);
      }
    } else if (mode === "multiple") {
      onSelect(value as any);
    } else {
      // Modo single
      onSelect(value as Date);
    }
  };

  // Nombres de los días en español
  const weekdayLabels = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ'];

  return (
    <div className={cn("p-3", className)}>
      <ReactCalendar
        className={cn(
          "border-none shadow-none font-sans",
          "react-calendar--custom-theme"
        )}
        onChange={handleDateChange as any}
        value={convertSelected as any}
        selectRange={mode === "range"}
        formatShortWeekday={(_, date) => weekdayLabels[date.getDay()]}
        formatMonthYear={(_, date) => 
          format(date, 'MMMM yyyy', { locale: es }).toUpperCase()
        }
        locale="es-ES"
        nextLabel={<ChevronRight className="h-4 w-4" />}
        prevLabel={<ChevronLeft className="h-4 w-4" />}
        next2Label={null}
        prev2Label={null}
        calendarType="gregory" 
        showNeighboringMonth={true}
        view="month"
        tileDisabled={disabled ? ({ date }) => !!disabled?.(date) : undefined}
        defaultActiveStartDate={defaultMonth}
        minDetail="month"
        maxDetail="month"
      />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .react-calendar--custom-theme {
          width: 100%;
          max-width: 100%;
          background: transparent;
          font-family: inherit;
        }
        
        .react-calendar--custom-theme .react-calendar__navigation {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 0.5rem;
          position: relative;
        }
        
        .react-calendar--custom-theme .react-calendar__navigation button {
          min-width: 2rem;
          height: 2rem;
          background: none;
          border-radius: 0.375rem;
          opacity: 0.5;
          transition: opacity 0.2s;
        }
        
        .react-calendar--custom-theme .react-calendar__navigation button:enabled:hover,
        .react-calendar--custom-theme .react-calendar__navigation button:enabled:focus {
          opacity: 1;
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .react-calendar--custom-theme .react-calendar__navigation__label {
          font-weight: 500;
          font-size: 0.875rem;
          opacity: 1;
          pointer-events: none;
          flex-grow: 1;
          text-transform: uppercase;
        }
        
        .react-calendar--custom-theme .react-calendar__navigation__prev-button {
          position: absolute;
          left: 0.25rem;
        }
        
        .react-calendar--custom-theme .react-calendar__navigation__next-button {
          position: absolute;
          right: 0.25rem;
        }
        
        .react-calendar--custom-theme .react-calendar__month-view__weekdays {
          font-size: 0.75rem;
          font-weight: normal;
          text-transform: uppercase;
          color: var(--muted-foreground, #64748b);
        }
        
        .react-calendar--custom-theme .react-calendar__month-view__weekdays__weekday {
          padding: 0.25rem;
          text-decoration: none;
          text-align: center;
        }
        
        .react-calendar--custom-theme .react-calendar__month-view__weekdays abbr {
          text-decoration: none;
        }
        
        .react-calendar--custom-theme .react-calendar__tile {
          aspect-ratio: 1 / 1;
          max-width: 2.5rem;
          height: 2.5rem;
          padding: 0;
          background: none;
          font-size: 0.875rem;
          line-height: 2.5rem;
          text-align: center;
          border-radius: 0.375rem;
          margin-bottom: 0.25rem;
        }
        
        .react-calendar--custom-theme .react-calendar__tile--now {
          background-color: var(--accent, #f1f5f9);
          color: var(--accent-foreground, #0f172a);
        }
        
        .react-calendar--custom-theme .react-calendar__tile--active,
        .react-calendar--custom-theme .react-calendar__tile--hasActive {
          background-color: var(--primary, #0f172a);
          color: var(--primary-foreground, #ffffff);
        }
        
        .react-calendar--custom-theme .react-calendar__tile:enabled:hover,
        .react-calendar--custom-theme .react-calendar__tile:enabled:focus {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .react-calendar--custom-theme .react-calendar__tile--active:enabled:hover,
        .react-calendar--custom-theme .react-calendar__tile--active:enabled:focus {
          background-color: var(--primary, #0f172a);
        }
        
        .react-calendar--custom-theme .react-calendar__month-view__days__day--neighboringMonth {
          color: var(--muted-foreground, #64748b);
          opacity: 0.5;
        }
        
        .react-calendar--custom-theme .react-calendar__tile:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}} />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
