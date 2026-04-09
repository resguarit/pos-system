"use client"

import { useCallback, useEffect, useState } from "react"
import useApi from "@/hooks/useApi"
import { sileo } from "sileo"

export type ServiceExpiringMode = "due_soon" | "expired"

export type ServiceExpiringRow = {
    id: number
    customer_id: number
    customer_display_name: string | null
    service_name: string
    billing_cycle: string
    next_due_date: string
    amount: string
}

type Summary = {
    mode: ServiceExpiringMode
    days: number | null
}

type Options = {
    active: boolean
    perPage?: number
}

export function useServiceExpiringReport(options: Options) {
    const { active, perPage = 10 } = options
    const { request } = useApi()

    const [mode, setMode] = useState<ServiceExpiringMode>("due_soon")
    const [days, setDays] = useState(30)
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")

    const [rows, setRows] = useState<ServiceExpiringRow[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
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

    useEffect(() => {
        setCurrentPage(1)
    }, [mode, days])

    const fetchList = useCallback(
        async (signal?: AbortSignal) => {
            if (!active) return
            try {
                setLoading(true)
                const resp = await request({
                    method: "GET",
                    url: "/client-services/expiring",
                    params: {
                        mode,
                        days: mode === "due_soon" ? days : undefined,
                        search: debouncedSearch || undefined,
                        page: currentPage,
                        per_page: perPage,
                    },
                    signal,
                })

                const data = Array.isArray(resp?.data) ? resp.data : []
                setRows(data as ServiceExpiringRow[])
                setTotalItems(Number(resp?.total) || 0)
                setTotalPages(Number(resp?.last_page) || 1)
                setSummary((resp?.summary || null) as Summary | null)
            } catch (err: unknown) {
                const e = err as { name?: string; message?: string }
                if (e?.name !== "AbortError" && e?.message !== "canceled") {
                    console.error("Error fetching expiring services report", err)
                    sileo.error({ title: "No se pudo cargar vencimientos" })
                    setRows([])
                    setSummary(null)
                }
            } finally {
                setLoading(false)
            }
        },
        [active, request, mode, days, debouncedSearch, currentPage, perPage]
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
        mode,
        setMode,
        days,
        setDays,
        search,
        setSearch,
        rows,
        summary,
        loading,
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems,
        refetch,
    }
}

