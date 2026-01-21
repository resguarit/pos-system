"use client"
import * as React from "react"
import { format, startOfDay } from "date-fns"
import type { Locale } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Exporta la interfaz DateRange para uso global
export interface DateRange {
  from: Date;
  to?: Date;
}

// Función para formatear fechas de manera segura
const safeFormat = (date: Date | undefined, formatStr: string, options?: { locale?: Locale }): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  try {
    return format(date, formatStr, options);
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return '';
  }
}

interface DatePickerWithRangeProps {
  className?: string
  selected: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
  align?: "center" | "start" | "end"
  side?: "top" | "right" | "bottom" | "left"
  showClearButton?: boolean
  onClear?: () => void
}

export function DatePickerWithRange({ className, selected, onSelect, align = "start", side = "bottom", showClearButton = false, onClear }: DatePickerWithRangeProps) {
  // Estado para controlar la apertura/cierre del Popover
  const [open, setOpen] = React.useState(false);
  // Calculamos el ancho del contenido del calendario según el número de meses
  const isMobile = React.useMemo(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  }, []);

  // Handler para limpiar las fechas
  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onSelect(undefined);
    }
  }, [onClear, onSelect]);

  // Helper to check if a date is valid
  const isValidDate = (date: unknown): date is Date => {
    return date instanceof Date && !isNaN(date.getTime()) && date.getFullYear() >= 1970;
  };

  // Adaptador para convertir entre los tipos de fecha  
  const handleSelect = React.useCallback((input: Date | { from: Date; to?: Date } | null) => {
    // Si recibimos null o undefined, limpiar selección
    if (!input) {
      onSelect(undefined);
      return;
    }

    // Si es un Date solo (no debería pasar en mode="range", pero manejamos por seguridad)
    if (input instanceof Date) {
      if (isValidDate(input)) {
        onSelect({ from: startOfDay(input) });
      }
      return;
    }

    // Es un objeto range
    const { from, to } = input;

    // Caso 1: No hay fecha de inicio válida - no hacer nada
    if (!isValidDate(from)) {
      return;
    }

    // Normalizar la fecha de inicio
    const normalizedFrom = startOfDay(from);

    // Caso 2: Solo hay fecha de inicio (primera selección del usuario)
    // Mantenemos el calendario abierto y esperamos la segunda fecha
    if (!to || !isValidDate(to)) {
      // Solo actualizar si estamos iniciando una nueva selección
      // (evitar actualizar si ya teníamos from sin to)
      if (!selected?.from || (selected.to)) {
        onSelect({ from: normalizedFrom });
      }
      return;
    }

    // Caso 3: Tenemos ambas fechas válidas - rango completo
    const normalizedTo = startOfDay(to);

    // Asegurar que from <= to
    if (normalizedFrom <= normalizedTo) {
      onSelect({ from: normalizedFrom, to: normalizedTo });
    } else {
      onSelect({ from: normalizedTo, to: normalizedFrom });
    }

    // Cerrar el calendario después de seleccionar el rango completo
    setTimeout(() => setOpen(false), 100);
  }, [selected, onSelect, setOpen]);

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn("w-[220px] justify-start text-left font-normal", !selected && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selected && selected.from && !isNaN(selected.from.getTime()) ? (
                selected.to && !isNaN(selected.to.getTime()) ? (
                  <>
                    {safeFormat(selected.from, "dd/MM/yyyy", { locale: es })} -{" "}
                    {safeFormat(selected.to, "dd/MM/yyyy", { locale: es })}
                  </>
                ) : (
                  safeFormat(selected.from, "dd/MM/yyyy", { locale: es })
                )
              ) : (
                <span>Seleccionar fechas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn("w-auto p-0", isMobile ? "max-w-[320px]" : "w-auto")}
            align={align}
            side={side}
            sideOffset={5}
          >
            {/* SIMPLIFIED: Using single Calendar with months prop */}
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={selected?.from || new Date()}
              selected={selected}
              onSelect={handleSelect}
              months={1} // Always show 1 month as requested
              className="w-full"
            />
          </PopoverContent>
        </Popover>
        {showClearButton && selected && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            title="Limpiar fechas"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
