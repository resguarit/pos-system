"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeletonBodyRows } from "@/components/ui/loading-states"
import Pagination from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { useServiceExpiringReport } from "@/hooks/useServiceExpiringReport"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AlertTriangle, CalendarClock, RefreshCw, Search } from "lucide-react"

type Props = {
    active: boolean
    formatCurrency: (amount: string | number) => string
}

export default function ServiceExpiringPanel({ active, formatCurrency }: Props) {
    const {
        mode,
        setMode,
        days,
        setDays,
        search,
        setSearch,
        rows,
        loading,
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems,
        refetch,
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
        <Card>
            <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="text-base sm:text-lg">Vencimientos</CardTitle>
                        <CardDescription>Servicios activos con vencimiento próximo o vencidos.</CardDescription>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={loading}
                        className="gap-2"
                        title="Actualizar"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Actualizar
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

                    {mode === "due_soon" ? (
                        <div className="ml-auto flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Ventana</Label>
                            <div className="flex items-center rounded-md border bg-background px-2 py-1">
                                <input
                                    className="w-14 bg-transparent text-sm outline-none"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={days}
                                    onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 30)))}
                                />
                                <span className="text-xs text-muted-foreground">días</span>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar cliente o servicio…"
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoComplete="off"
                    />
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="rounded-md border">
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
            </CardContent>
        </Card>
    )
}

