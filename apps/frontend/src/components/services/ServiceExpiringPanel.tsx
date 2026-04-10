"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonBodyRows } from "@/components/ui/loading-states"
import Pagination from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { useServiceExpiringReport } from "@/hooks/useServiceExpiringReport"
import { DateInputDmy } from "@/components/ui/date-input-dmy"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AlertTriangle, CalendarRange, CalendarClock, Search } from "lucide-react"

type Props = {
    active: boolean
    formatCurrency: (amount: string | number) => string
}

export default function ServiceExpiringPanel({ active, formatCurrency }: Props) {
    const {
        mode,
        setMode,
        activePreset,
        applyPresetThisMonth,
        applyPresetNextMonth,
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        includeExpired,
        setIncludeExpired,
        search,
        setSearch,
        rows,
        summary,
        loading,
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems,
    } = useServiceExpiringReport({ active, perPage: 10 })

    const [colWidths, setColWidths] = useState<Record<string, number>>({
        due: 120,
        customer: 220,
        service: 240,
        amount: 120,
    })

    const dragRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null)

    const endDrag = useCallback(() => {
        dragRef.current = null
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
    }, [])

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current) return
            const { key, startX, startWidth } = dragRef.current
            const delta = e.clientX - startX
            const next = Math.max(90, Math.min(520, startWidth + delta))
            setColWidths((w) => ({ ...w, [key]: next }))
        }
        const onUp = () => endDrag()

        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseup", onUp)
        return () => {
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("mouseup", onUp)
        }
    }, [endDrag])

    const startDrag = useCallback(
        (key: string, e: React.MouseEvent) => {
            e.preventDefault()
            dragRef.current = { key, startX: e.clientX, startWidth: colWidths[key] ?? 160 }
            document.body.style.cursor = "col-resize"
            document.body.style.userSelect = "none"
        },
        [colWidths]
    )

    const Head = useCallback(
        ({
            colKey,
            className,
            children,
        }: {
            colKey: string
            className?: string
            children: React.ReactNode
        }) => (
            <TableHead className={cn("relative whitespace-nowrap", className)} style={{ width: colWidths[colKey] }}>
                <div className="flex items-center gap-2 pr-3">{children}</div>
                <div
                    role="separator"
                    aria-orientation="vertical"
                    title="Arrastrar para ajustar"
                    onMouseDown={(e) => startDrag(colKey, e)}
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none select-none"
                >
                    <div className="mx-auto h-full w-[1px] bg-border/70 hover:bg-border" />
                </div>
            </TableHead>
        ),
        [colWidths, startDrag]
    )

    return (
        <div className="space-y-4">
                {/* Header removed per UX request */}

                {/* Total (nemesis of Cobros) */}
                <Card className="border h-[176px]">
                    <CardHeader className="space-y-2 pb-3 h-[122px]">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-emerald-700" />
                                <CardTitle className="text-base sm:text-lg text-foreground">Total a cobrar en el período</CardTitle>
                            </div>
                            {summary?.period_from && summary?.period_to ? (
                                <p className="min-h-[16px] text-xs text-muted-foreground leading-snug">
                                    {`${format(new Date(summary.period_from), "d MMM yyyy", { locale: es })} — ${format(
                                        new Date(summary.period_to),
                                        "d MMM yyyy",
                                        { locale: es }
                                    )}`}
                                </p>
                            ) : null}
                        </div>
                        <CardDescription className="min-h-[40px]">
                            Suma de todos los servicios a cobrar en el período (incluye todas las páginas del listado).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold tracking-tight text-foreground">
                            {loading && !summary ? "…" : formatCurrency(summary?.total_amount ?? 0)}
                        </div>
                    </CardContent>
                </Card>

                {/* Presets + filters */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant={activePreset === "this_month" ? "default" : "secondary"}
                                size="sm"
                                onClick={applyPresetThisMonth}
                                className="gap-1.5"
                                aria-pressed={activePreset === "this_month"}
                            >
                                <CalendarRange className="h-3.5 w-3.5" />
                                Este mes
                            </Button>
                            <Button
                                type="button"
                                variant={activePreset === "next_month" ? "default" : "outline"}
                                size="sm"
                                onClick={applyPresetNextMonth}
                                aria-pressed={activePreset === "next_month"}
                            >
                                Mes que viene
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant={mode === "due_soon" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setMode("due_soon")}
                                className="gap-2"
                                aria-pressed={mode === "due_soon"}
                            >
                                <CalendarClock className="h-4 w-4" />
                                Por vencer
                            </Button>
                            <Button
                                type="button"
                                variant={mode === "expired" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setMode("expired")}
                                className="gap-2"
                                aria-pressed={mode === "expired"}
                            >
                                <AlertTriangle className="h-4 w-4" />
                                Vencidos
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <Label>Desde</Label>
                            <DateInputDmy value={fromDate} onChange={setFromDate} aria-label="Desde" />
                        </div>
                        <div className="space-y-2">
                            <Label>Hasta</Label>
                            <DateInputDmy value={toDate} onChange={setToDate} aria-label="Hasta" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Buscar</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Cliente o servicio…"
                                    className="pl-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-2 lg:col-span-4">
                            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                                <Checkbox
                                    checked={includeExpired}
                                    onCheckedChange={(checked) => setIncludeExpired(Boolean(checked))}
                                    disabled={mode !== "due_soon"}
                                />
                                <span>Incluir vencidos</span>
                                <span className="text-xs text-muted-foreground">
                                    (suma también vencidos anteriores al período)
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="rounded-md border bg-background">
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow>
                                    <Head colKey="due">Vence</Head>
                                    <Head colKey="customer">Cliente</Head>
                                    <Head colKey="service">Servicio</Head>
                                    <Head colKey="amount" className="text-right">
                                        Monto
                                    </Head>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableSkeletonBodyRows columns={4} rows={8} />
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                                            No hay servicios para mostrar.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((r) => (
                                        <TableRow key={r.id} className="hover:bg-muted/50">
                                            <TableCell style={{ width: colWidths.due }} className="whitespace-nowrap font-medium">
                                                {r.next_due_date ? format(new Date(r.next_due_date), "dd/MM/yyyy", { locale: es }) : "—"}
                                            </TableCell>
                                            <TableCell style={{ width: colWidths.customer }}>
                                                <span className="truncate block">{r.customer_display_name || "—"}</span>
                                            </TableCell>
                                            <TableCell style={{ width: colWidths.service }}>
                                                <span className="truncate block">{r.service_name}</span>
                                            </TableCell>
                                            <TableCell style={{ width: colWidths.amount }} className="text-right tabular-nums">
                                                {formatCurrency(r.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 ? (
                        <Pagination
                            currentPage={currentPage}
                            lastPage={totalPages}
                            total={totalItems}
                            itemName={mode === "expired" ? "vencidos" : "por vencer"}
                            onPageChange={setCurrentPage}
                            disabled={loading}
                            className="pt-0"
                        />
                    ) : null}
                </div>
        </div>
    )
}

