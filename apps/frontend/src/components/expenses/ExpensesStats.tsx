import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2 } from "lucide-react";

interface ExpenseStat {
    month: string;
    total: number;
    projected?: number;
}

interface CategoryStat {
    name: string;
    value: number;
}

interface ExpensesStatsProps {
    stats: {
        by_month: ExpenseStat[];
        by_category: CategoryStat[];
    } | null;
    loading: boolean;
}

export function ExpensesStats({ stats, loading }: ExpensesStatsProps) {
    if (loading) {
        return (
            <>
                <Card className="col-span-1 xl:col-span-5 h-[280px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </Card>
                <Card className="col-span-1 xl:col-span-4 h-[280px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </Card>
            </>
        );
    }

    if (!stats) return null;

    // Colores para el gráfico de torta
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <>
            <Card className="col-span-1 xl:col-span-5 h-full">
                <CardHeader>
                    <CardTitle>Evolución Mensual</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.by_month}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Periodo
                                                        </span>
                                                        <span className="font-bold text-muted-foreground">
                                                            {label}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {payload.map((entry: { name: string; value: number; color?: string }, index: number) => {
                                                        if (entry.value === 0) return null;
                                                        const name = entry.name === 'projected' ? 'Proyección' : 'Total';
                                                        return (
                                                            <div key={index} className="flex flex-col">
                                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                    {name}
                                                                </span>
                                                                <span className="font-bold" style={{ color: entry.color }}>
                                                                    ${Number(entry.value).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="total" fill="#adfa1d" radius={[4, 4, 0, 0]} stackId="a" name="Total Gastos" />
                                <Bar
                                    dataKey="projected"
                                    name="Proyección"
                                    fill="#adfa1d"
                                    fillOpacity={0.2}
                                    stroke="#adfa1d"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    radius={[4, 4, 0, 0]}
                                    stackId="a"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
            <Card className="col-span-1 xl:col-span-4 h-full">
                <CardHeader>
                    <CardTitle>Por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-[200px]">
                        <div className="w-[50%] h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.by_category}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {stats.by_category.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-[50%] flex flex-col justify-center gap-2 pl-2 overflow-y-auto max-h-[200px]">
                            {stats.by_category.map((entry, index) => (
                                <div key={index} className="flex items-center text-sm text-muted-foreground">
                                    <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="truncate" title={entry.name}>{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
