"use client"
import * as React from "react"
import { format } from "date-fns"
import type { Locale } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

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
}

export function DatePickerWithRange({ className, selected, onSelect }: DatePickerWithRangeProps) {
  // Estado para controlar la apertura/cierre del Popover
  const [open, setOpen] = React.useState(false);
  // Calculamos el ancho del contenido del calendario según el número de meses
  const isMobile = React.useMemo(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  }, []);

  // Adaptador para convertir entre los tipos de fecha  
  const handleSelect = React.useCallback((date: Date | null | { from: Date; to?: Date }) => {
    
    // Si recibimos null o undefined, simplemente pasamos undefined al callback
    if (!date) {
      onSelect(undefined);
      return;
    }
      // Si recibimos un objeto de rango completo del calendario
    if (typeof date === "object" && "from" in date) {
      // Asegurarnos que ambas fechas son válidas
      const from = date.from instanceof Date ? date.from : new Date(date.from);
      let to = date.to instanceof Date ? date.to : 
              date.to ? new Date(date.to) : undefined;
      
      // Verificar que la fecha "from" es válida (no es anterior a 1970)
      if (!isNaN(from.getTime()) && from.getFullYear() >= 1970) {        
        if (to && !isNaN(to.getTime()) && to.getFullYear() >= 1970) {
          // Primero actualizar la selección y luego cerrar el calendario
          onSelect({ from, to });

          setTimeout(() => setOpen(false), 100);
        } else {
          onSelect({ from });
        }
      } else {
        console.error("Fecha 'from' inválida, usando fecha actual:", from);
        // Usar fecha actual si es inválida
        onSelect({ from: new Date() });
      }
      return;
    }
      // Si es una fecha, verificar que sea válida y posterior a 1970
    if (date instanceof Date && !isNaN(date.getTime()) && date.getFullYear() >= 1970) {
      // Si ya tenemos una fecha de inicio pero no de fin, establecer como fin
      if (selected?.from && !selected.to) {
        const newRange = {
          from: new Date(selected.from),
          to: new Date(date)
        };
          // Ordenar las fechas (por si el usuario selecciona primero fecha fin y luego inicio)
        if (date < selected.from) {
          newRange.from = new Date(date);
          newRange.to = new Date(selected.from);
        }
          // Actualizar la selección y luego cerrar el calendario
        onSelect(newRange);
        // Cerramos después de un pequeño delay para asegurar que la actualización se complete
        setTimeout(() => setOpen(false), 100);} else {
        // Establecer solo fecha de inicio
        onSelect({ from: new Date(date) });
        // No cerramos el calendario para permitir seleccionar la segunda fecha
      }
    }
  }, [selected, onSelect, setOpen]);
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-[300px] justify-start text-left font-normal", !selected && "text-muted-foreground")}
          >            <CalendarIcon className="mr-2 h-4 w-4" />            {selected && selected.from && !isNaN(selected.from.getTime()) ? (
              selected.to && !isNaN(selected.to.getTime()) ? (
                <>
                  {safeFormat(selected.from, "dd/MM/yyyy", { locale: es })} -{" "}
                  {safeFormat(selected.to, "dd/MM/yyyy", { locale: es })}
                </>
              ) : (
                safeFormat(selected.from, "dd/MM/yyyy", { locale: es })
              )
            ) : (
              <span>Seleccionar rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>        <PopoverContent 
          className={cn("w-auto p-0", isMobile ? "max-w-[320px]" : "min-w-[600px]")} 
          align="start"
        >
          <div className={cn(isMobile ? "" : "grid grid-cols-2 gap-2")}>
            <Calendar
              initialFocus              mode="range"
              defaultMonth={selected?.from || new Date()}
              selected={selected}
              onSelect={handleSelect}
              className="w-full"
            />
            
            {/* Si no está en móvil, muestra un segundo calendario */}
            {!isMobile && (
              <Calendar
                mode="range"
                defaultMonth={selected?.from 
                  ? new Date(selected.from.getFullYear(), selected.from.getMonth() + 1)
                  : new Date(new Date().getFullYear(), new Date().getMonth() + 1)}                selected={selected}
                onSelect={handleSelect}
                className="w-full"
              />
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
