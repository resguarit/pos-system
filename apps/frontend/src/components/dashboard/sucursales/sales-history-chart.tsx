import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, BarChart3, Loader2 } from "lucide-react";
import useApi from '@/hooks/useApi';
import { sileo } from "sileo"
import { format, parse, isValid, eachDayOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';

// Helper: parse numbers that might come formatted as '19.356,10'
const safeToNumber = (value: unknown): number => {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value
      .replace(/\s+/g, '') // remove spaces
      .replace(/\./g, '')  // remove thousand separators
      .replace(/,/g, '.');  // replace decimal comma
    const n = Number(cleaned);
    return isFinite(n) ? n : 0;
  }
  return 0;
};

interface SalesHistoryData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

interface SalesHistoryChartProps {
  branchId?: number | null;
  className?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

const SalesHistoryChart: React.FC<SalesHistoryChartProps> = ({ branchId, className, dateRange }) => {
  const [chartData, setChartData] = useState<SalesHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const { request } = useApi();

  const fetchSalesHistory = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = branchId
        ? `/sales/history/branch/${branchId}`
        : `/sales/global/history`;
      
      const params: any = { 
        group_by: groupBy,
      };
      
      if (dateRange?.from) {
        params.from_date = format(dateRange.from, 'yyyy-MM-dd');
      }
      if (dateRange?.to) {
        params.to_date = format(dateRange.to, 'yyyy-MM-dd');
      }

      const apiResponse = await request({
        method: 'GET',
        url: baseUrl,
        params,
        signal
      });

      // Verifica que la respuesta tenga la estructura esperada
      const chartData = apiResponse?.data || apiResponse;
      if (!chartData || !Array.isArray(chartData.labels)) {
        throw new Error('Estructura de datos inválida');
      }

      const processedChartData: SalesHistoryData = {
        labels: chartData.labels,
        datasets: chartData.datasets.map((dataset: any) => ({
          ...dataset,
          data: Array.isArray(dataset.data)
            ? dataset.data.map((value: any) => safeToNumber(value))
            : [],
        })),
      };

      // --- Nuevo: completar huecos según rango seleccionado ---
      const from = dateRange?.from ? new Date(dateRange.from) : undefined;
      const to = dateRange?.to ? new Date(dateRange.to) : undefined;

      // Función para normalizar etiquetas entrantes a llaves de fecha
      const normalizeKey = (label: string, mode: 'day' | 'month'): string => {
        const ref = dateRange?.from || dateRange?.to || new Date();
        const currentYear = new Date().getFullYear(); // Usar el año actual directamente
        
        // PRIMERO: Intentar parsing manual para dd/MM sin año (más común)
        const ddmmMatch = label.match(/^(\d{1,2})\/(\d{1,2})$/);
        if (ddmmMatch) {
          const [, day, month] = ddmmMatch;
          const date = new Date(currentYear, parseInt(month) - 1, parseInt(day));
          if (isValid(date)) {
            const result = mode === 'day' ? format(date, 'yyyy-MM-dd') : format(date, 'yyyy-MM');
            return result;
          }
        }
        
        // SEGUNDO: Intentar con formatos que incluyen año
        const locales = [esLocale, undefined];
        const dayFormats = [
          'yyyy-MM-dd',
          "yyyy-MM-dd'T'HH:mm:ss",
          'yyyy-MM-dd HH:mm:ss',
          'dd/MM/yyyy',
          'dd/MM/yyyy HH:mm:ss',
          'dd-MM-yyyy',
          'dd-MM-yyyy HH:mm:ss',
          'MM/dd/yyyy',
          'MM/dd/yyyy HH:mm:ss',
          'MM-dd-yyyy',
          'MM-dd-yyyy HH:mm:ss',
        ];
        const monthFormats = [
          'yyyy-MM',
          'yyyy/MM',
          'MM/yyyy',
          'MM-yyyy',
          'MMM yyyy',
          'LLLL yyyy',
          'MMMM yyyy',
          'LLL yyyy',
        ];

        const tryFormats = (formats: string[]): Date | null => {
          for (const f of formats) {
            for (const loc of locales) {
              const d = parse(label, f, ref as Date, loc ? { locale: loc } : undefined);
              if (isValid(d)) {
                return d;
              }
            }
          }
          return null;
        };

        // Intentar con formatos completos
        if (mode === 'day') {
          const d1 = tryFormats(dayFormats);
          if (d1) return format(d1, 'yyyy-MM-dd');
        } else {
          const m1 = tryFormats(monthFormats);
          if (m1) return format(m1, 'yyyy-MM');
          const d3 = tryFormats(dayFormats);
          if (d3) return format(d3, 'yyyy-MM');
        }

        // Intento genérico final
        const d = new Date(label);
        if (isValid(d)) {
          const result = mode === 'day' ? format(d, 'yyyy-MM-dd') : format(d, 'yyyy-MM');
          return result;
        }
        
        return label;
      };

      // Construir llaves objetivo y etiquetas de visualización
      let targetKeys: string[] = [];
      let displayLabels: string[] = [];
      if (from && to) {
        if (groupBy === 'day') {
          const days = eachDayOfInterval({ start: from, end: to });
          targetKeys = days.map(d => format(d, 'yyyy-MM-dd'));
          displayLabels = days.map(d => format(d, 'dd/MM'));
        } else {
          const startM = startOfMonth(from);
          const endM = endOfMonth(to);
          const months = eachMonthOfInterval({ start: startM, end: endM });
          targetKeys = months.map(d => format(d, 'yyyy-MM'));
          displayLabels = months.map(d => format(d, 'LLLL yyyy', { locale: esLocale }));
        }
      } else {
        // Si no hay rango, usar lo que venga del backend (normalizado)
        const keys = processedChartData.labels.map(l => normalizeKey(l, groupBy));
        if (groupBy === 'month') {
          const uniq = Array.from(new Set(keys)).sort();
          targetKeys = uniq;
          displayLabels = uniq.map(k => {
            const d = parse(`${k}-01`, 'yyyy-MM-dd', new Date());
            return isValid(d) ? format(d, 'LLLL yyyy', { locale: esLocale }) : k;
          });
        } else {
          targetKeys = keys;
          displayLabels = processedChartData.labels.map(l => {
            const d = parse(l, 'yyyy-MM-dd', new Date());
            return isValid(d) ? format(d, 'dd/MM') : l;
          });
        }
      }

      // Debug: log para ver qué están devolviendo los datos

      // Mapear datos entrantes por dataset y por llave normalizada (acumulando valores)
      const incomingMaps: Record<string, Record<string, number>> = {};
      processedChartData.datasets.forEach(ds => {
        const map: Record<string, number> = {};
        processedChartData.labels.forEach((lbl, idx) => {
          const key = normalizeKey(lbl, groupBy);
          const val = safeToNumber(ds.data[idx]);
          map[key] = (map[key] ?? 0) + val;
        });
        incomingMaps[ds.label] = map;
      });


      // Relleno por targetKeys
      const filledDatasets = processedChartData.datasets.map(ds => ({
        ...ds,
        data: targetKeys.map(k => {
          const val = incomingMaps[ds.label]?.[k] ?? 0;
          return val;
        }),
      }));

      const filledChartData: SalesHistoryData = { labels: displayLabels, datasets: filledDatasets };

      const hasData = filledChartData.datasets.some(ds => ds.data.some(val => (Number(val) || 0) > 0));
      const originalHasData = processedChartData.datasets.some(ds => ds.data.some(val => (Number(val) || 0) > 0));


      // En modo mes, no volver a etiquetas diarias: usar siempre la agregación mensual
      if (groupBy === 'month') {
        setChartData(filledChartData);
      } else if (!hasData && originalHasData) {
        setChartData(processedChartData);
      } else {
        setChartData(filledChartData);
      }

      if (!hasData && !originalHasData) {
        sileo.info({ title: 'No hay datos de ventas para el período seleccionado.' });
      }
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED' && err.name !== 'AbortError') {
        setError('Error al cargar el historial de ventas.');
        sileo.error({ title: 'Error al cargar el historial de ventas.' });
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, dateRange, groupBy, request]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSalesHistory(controller.signal);
    return () => controller.abort();
  }, [fetchSalesHistory]);

  const handleGroupByChange = (newGroupBy: 'day' | 'month') => {
    if (loading || groupBy === newGroupBy) return; // Evitar cambios si está cargando o es el mismo
    setGroupBy(newGroupBy);
    // No necesitas forzar un re-render aquí, el efecto se encargará
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">Cargando gráfico de ventas...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.datasets.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No hay datos de ventas disponibles.
          </div>
        </CardContent>
      </Card>
    );
  }

  const dataForChart = chartData.labels.map((label, index) => {
    const entry: any = { name: label };
    chartData.datasets.forEach(ds => {
      entry[ds.label] = ds.data[index] ?? 0;
    });
    return entry;
  });

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={groupBy === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleGroupByChange('day')}
              disabled={loading}
              className="cursor-pointer"
            >
              {loading && groupBy === 'day' ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-1 h-4 w-4" />
              )}
              Por Día
            </Button>
            <Button
              variant={groupBy === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleGroupByChange('month')}
              disabled={loading}
              className="cursor-pointer"
            >
              {loading && groupBy === 'month' ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-1 h-4 w-4" />
              )}
              Por Mes
            </Button>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataForChart} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickFormatter={(value) => {
                  // En modo mes, las etiquetas ya vienen como 'LLLL yyyy' en español
                  return value;
                }}
              />
              <YAxis 
                tickFormatter={(value) => value.toLocaleString("es-AR")}
              />
              <Tooltip 
                formatter={(value: number) => value.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              />
              <Legend />
              {chartData!.datasets.map(ds => (
                <Bar 
                  key={ds.label} 
                  dataKey={ds.label} 
                  fill={ds.backgroundColor || '#8884d8'} 
                  name={ds.label}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesHistoryChart;