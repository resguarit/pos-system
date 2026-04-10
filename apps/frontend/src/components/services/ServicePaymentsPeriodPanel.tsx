"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonBodyRows } from "@/components/ui/loading-states"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DateInputDmy } from "@/components/ui/date-input-dmy"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarRange, Eye, Receipt, RefreshCw, Search } from "lucide-react"
import Pagination from "@/components/ui/pagination"
import { useServicePaymentsReport } from "@/hooks/useServicePaymentsReport"
import { getBillingCycleLabel } from "@/utils/billingCycleUtils"
import { cn } from "@/lib/utils"

type Props = {
    active: boolean
    formatCurrency: (amount: string | number) => string
    onViewService?: (serviceId: number) => void
}

export default function ServicePaymentsPeriodPanel({ active, formatCurrency, onViewService }: Props) {
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        date: 120,
        customer: 220,
        service: 240,
        cycle: 140,
        amount: 120,
        notes: 240,
        action: 72,
    })

    const dragRef = useRef<{
        key: string
        startX: number
        startWidth: number
    } | null>(null)

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
            const next = Math.max(80, Math.min(520, startWidth + delta))
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

    const startDrag = useCallback((key: string, e: React.MouseEvent) => {
        e.preventDefault()
        dragRef.current = { key, startX: e.clientX, startWidth: colWidths[key] ?? 160 }
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"
    }, [colWidths])

    const Head = useCallback(
        ({
            colKey,
            className,
            children,
            hideHandle,
        }: {
            colKey: string
            className?: string
            children: React.ReactNode
            hideHandle?: boolean
        }) => (
            <TableHead
                className={cn("relative whitespace-nowrap", className)}
                style={{ width: colWidths[colKey] }}
            >
                <div className="flex items-center gap-2 pr-3">{children}</div>
                {!hideHandle ? (
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        title="Arrastrar para ajustar"
                        onMouseDown={(e) => startDrag(colKey, e)}
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none select-none"
                    >
                        <div className="mx-auto h-full w-[1px] bg-border/70 hover:bg-border" />
                    </div>
                ) : null}
            </TableHead>
        ),
        [colWidths, startDrag]
    )

    const {
        activePreset,
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        search,
        setSearch,
        rows,
        summary,
        loading,
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems,
        applyPresetThisMonth,
        applyPresetPreviousMonth,
        refetch,
    } = useServicePaymentsReport({ active, perPage: 10 })

    const periodLabel =
        summary &&
        `${format(new Date(summary.period_from), "d MMM yyyy", { locale: es })} — ${format(
            new Date(summary.period_to),
            "d MMM yyyy",
            { locale: es }
        )}`

    return (
        <div className="space-y-4">
            <Card className="border border-emerald-200/70 bg-card h-[176px]">
                <CardHeader className="space-y-2 pb-3 h-[122px]">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-emerald-700" />
                            <CardTitle className="text-base sm:text-lg text-foreground">Total cobrado en el período</CardTitle>
                        </div>
                        {summary && (
                            <p className="min-h-[16px] text-xs text-muted-foreground leading-snug">{periodLabel}</p>
                        )}
                    </div>
                    <CardDescription className="min-h-[40px]">
                        Suma de todos los pagos registrados de servicios recurrentes (incluye todas las páginas del listado).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-semibold tracking-tight text-foreground">
                        {loading && !summary ? "…" : formatCurrency(summary?.total_amount ?? 0)}
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyPresetThisMonth}
                        className={cn(
                            "w-[120px] justify-center gap-1.5",
                            activePreset === "this_month"
                                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                                : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        aria-pressed={activePreset === "this_month"}
                    >
                        <CalendarRange className="h-3.5 w-3.5" />
                        Este mes
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyPresetPreviousMonth}
                        className={cn(
                            "w-[120px] justify-center",
                            activePreset === "previous_month"
                                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                                : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        aria-pressed={activePreset === "previous_month"}
                    >
                        Mes anterior
                    </Button>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={loading}
                    className="gap-2 self-start lg:self-auto"
                    title="Actualizar listado"
                >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Actualizar
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                    <Label htmlFor="payments-from">Desde</Label>
                    <DateInputDmy
                        id="payments-from"
                        value={fromDate}
                        onChange={setFromDate}
                        aria-label="Fecha desde"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="payments-to">Hasta</Label>
                    <DateInputDmy id="payments-to" value={toDate} onChange={setToDate} aria-label="Fecha hasta" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="payments-search">Buscar</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="payments-search"
                            type="search"
                            placeholder="Cliente o nombre del servicio…"
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>

            <Card>
                <div className="rounded-md border">
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow>
                                <Head colKey="date">Fecha cobro</Head>
                                <Head colKey="customer">Cliente</Head>
                                <Head colKey="service">Servicio</Head>
                                <Head colKey="cycle" className="hidden md:table-cell">
                                    Ciclo
                                </Head>
                                <Head colKey="amount" className="text-right">
                                    Monto
                                </Head>
                                <Head colKey="notes" className="hidden lg:table-cell">
                                    Notas
                                </Head>
                                {onViewService ? (
                                    <Head colKey="action" className="text-right" hideHandle>
                                        {" "}
                                    </Head>
                                ) : null}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableSkeletonBodyRows columns={onViewService ? 7 : 6} rows={8} />
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={onViewService ? 7 : 6} className="py-12 text-center text-muted-foreground">
                                        No hay cobros registrados en este período. Ajustá las fechas o probá otra búsqueda.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-muted/50">
                                        <TableCell className="whitespace-nowrap font-medium" style={{ width: colWidths.date }}>
                                            {format(new Date(row.payment_date), "dd/MM/yyyy", { locale: es })}
                                        </TableCell>
                                        <TableCell style={{ width: colWidths.customer }}>
                                            <span className="truncate block">{row.customer_display_name || "—"}</span>
                                        </TableCell>
                                        <TableCell style={{ width: colWidths.service }}>
                                            <span className="truncate block">{row.service_name || "Servicio"}</span>
                                        </TableCell>
                                        <TableCell
                                            className="hidden md:table-cell text-muted-foreground text-sm"
                                            style={{ width: colWidths.cycle }}
                                        >
                                            {row.billing_cycle ? getBillingCycleLabel(row.billing_cycle) : "—"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums" style={{ width: colWidths.amount }}>
                                            {formatCurrency(row.amount)}
                                        </TableCell>
                                        <TableCell
                                            className="hidden lg:table-cell text-sm text-muted-foreground"
                                            style={{ width: colWidths.notes }}
                                        >
                                            <span className="truncate block">{row.notes || "—"}</span>
                                        </TableCell>
                                        {onViewService ? (
                                            <TableCell className="text-right" style={{ width: colWidths.action }}>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="Ver servicio"
                                                    onClick={() => onViewService(row.client_service_id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        ) : null}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="border-t p-4">
                        <Pagination
                            currentPage={currentPage}
                            lastPage={totalPages}
                            total={totalItems}
                            itemName="cobros"
                            onPageChange={setCurrentPage}
                            disabled={loading}
                        />
                    </div>
                )}
            </Card>
        </div>
    )
}
