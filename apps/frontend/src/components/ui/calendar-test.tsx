import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

export function CalendarTest() {
  const [date, setDate] = React.useState<Date | null>(new Date());  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date(new Date().setDate(new Date().getDate() + 5))
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Selección simple</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate as any}
            className="w-full"
          />
          <p className="mt-4 text-sm">
            Fecha seleccionada: {date?.toLocaleDateString('es-ES')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selección de rango</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange as any}
            className="w-full"
          />
          <p className="mt-4 text-sm">
            Desde: {dateRange.from?.toLocaleDateString('es-ES')}<br />
            Hasta: {dateRange.to?.toLocaleDateString('es-ES')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
