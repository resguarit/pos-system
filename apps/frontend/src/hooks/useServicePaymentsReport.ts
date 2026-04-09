import { useState, useCallback, useEffect } from "react"
import useApi from "@/hooks/useApi"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { sileo } from "sileo"

export type ServicePaymentReportRow = {
    id: number
    payment_date: string
    amount: string
    notes: string | null
    client_service_id: number
    service_name: string | null
    billing_cycle: string | null
    customer_id: number | null
    customer_display_name: string | null
}

export type ServicePaymentReportSummary = {
    total_amount: number
    period_from: string
    period_to: string
}

type Options = {
    active: boolean
    perPage?: number
}

export function useServicePaymentsReport(options: Options) {
    const { active, perPage = 20 } = options
    const { request } = useApi()

    const [activePreset, setActivePreset] = useState<"this_month" | "previous_month" | "custom">("this_month")
    const [fromDate, setFromDateState] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"))
    const [toDate, setToDateState] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"))
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [rows, setRows] = useState<ServicePaymentReportRow[]>([])
    const [summary, setSummary] = useState<ServicePaymentReportSummary | null>(null)
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search.trim())
            setCurrentPage(1)
        }, 300)
        return () => clearTimeout(t)
    }, [search])

    const setFromDate = useCallback((v: string) => {
        setFromDateState(v)
        setCurrentPage(1)
        setActivePreset("custom")
    }, [])

    const setToDate = useCallback((v: string) => {
        setToDateState(v)
        setCurrentPage(1)
        setActivePreset("custom")
    }, [])

    const applyPresetThisMonth = useCallback(() => {
        const now = new Date()
        setFromDateState(format(startOfMonth(now), "yyyy-MM-dd"))
        setToDateState(format(endOfMonth(now), "yyyy-MM-dd"))
        setCurrentPage(1)
        setActivePreset("this_month")
    }, [])

    const applyPresetPreviousMonth = useCallback(() => {
        const prev = subMonths(new Date(), 1)
        setFromDateState(format(startOfMonth(prev), "yyyy-MM-dd"))
        setToDateState(format(endOfMonth(prev), "yyyy-MM-dd"))
        setCurrentPage(1)
        setActivePreset("previous_month")
    }, [])

    const fetchList = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoading(true)
                const resp = await request({
                    method: "GET",
                    url: "/client-services/payments",
                    params: {
                        from_date: fromDate,
                        to_date: toDate,
                        search: debouncedSearch || undefined,
                        page: currentPage,
                        per_page: perPage,
                    },
                    signal,
                })

                const data = Array.isArray(resp?.data) ? resp.data : []
                setRows(data as ServicePaymentReportRow[])
                setTotalItems(Number(resp?.total) || 0)
                setTotalPages(Number(resp?.last_page) || 1)
                if (resp?.summary) {
                    setSummary(resp.summary as ServicePaymentReportSummary)
                } else {
                    setSummary(null)
                }
            } catch (err: unknown) {
                const e = err as { name?: string; message?: string }
                if (e?.name !== "AbortError" && e?.message !== "canceled") {
                    console.error("Error fetching service payments report", err)
                    sileo.error({ title: "No se pudo cargar el listado de cobros" })
                    setRows([])
                    setSummary(null)
                }
            } finally {
                setLoading(false)
            }
        },
        [request, fromDate, toDate, debouncedSearch, currentPage, perPage]
    )

    useEffect(() => {
        if (!active) return
        const controller = new AbortController()
        fetchList(controller.signal)
        return () => controller.abort()
    }, [active, fetchList])

    const refetch = useCallback(() => {
        fetchList()
    }, [fetchList])

    return {
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
    }
}
