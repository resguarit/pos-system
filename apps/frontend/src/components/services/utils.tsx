import { Globe, Lock, Server, Wrench } from "lucide-react"
import { Service } from "./types"
import { getServicePaymentStatus } from "@/utils/servicePaymentStatus"

export const getServiceIcon = (name: string) => {
    const n = (name || "").toLowerCase()
    if (n.includes("dominio")) return <Globe className="h-5 w-5" />
    if (n.includes("ssl")) return <Lock className="h-5 w-5" />
    if (n.includes("hosting")) return <Server className="h-5 w-5" />
    if (n.includes("soporte") || n.includes("24/7")) return <Wrench className="h-5 w-5" />
    if (n.includes("vps")) return <Server className="h-5 w-5" />
    return <Server className="h-5 w-5" />
}

export const getServiceStatusBadge = (status: string) => {
    switch (status) {
        case "expired":
            return { label: "Vencido", className: "bg-red-100 text-red-700 border-red-200" }
        case "due_soon":
            return { label: "Por vencer", className: "bg-yellow-100 text-yellow-700 border-yellow-200" }
        case "active":
            return { label: "Al día", className: "bg-green-100 text-green-700 border-green-200" }
        case "inactive":
            return { label: "Inactivo", className: "bg-gray-100 text-gray-700 border-gray-200" }
        default:
            return { label: "Desconocido", className: "bg-gray-100 text-gray-700 border-gray-200" }
    }
}

export const getAccountStatusSummary = (services: Service[]) => {
    if (services.length === 0) return { label: "Sin servicios", color: "text-gray-500", dotColor: "bg-gray-400" }

    let expired = 0
    let dueSoon = 0

    services.forEach((svc) => {
        const status = getServicePaymentStatus(svc)
        if (status === "expired") expired += 1
        else if (status === "due_soon") dueSoon += 1
    })

    if (expired > 0) {
        return { label: `Vencido (${expired})`, color: "text-red-600", dotColor: "bg-red-500" }
    }

    if (dueSoon > 0) {
        return { label: `Por vencer (${dueSoon})`, color: "text-yellow-600", dotColor: "bg-yellow-500" }
    }

    return { label: "Al día", color: "text-green-600", dotColor: "bg-green-500" }
}

export const getCustomerInitial = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.trim().charAt(0) ?? ""
    const last = lastName?.trim().charAt(0) ?? ""
    return `${first}${last}`.toUpperCase()
}

export const getInitialColor = (initial: string) => {
    const colors = [
        "bg-blue-100 text-blue-700",
        "bg-green-100 text-green-700",
        "bg-purple-100 text-purple-700",
        "bg-orange-100 text-orange-700",
        "bg-pink-100 text-pink-700",
        "bg-indigo-100 text-indigo-700",
        "bg-cyan-100 text-cyan-700",
        "bg-amber-100 text-amber-700",
    ]
    if (!initial) return colors[0]
    const code = initial.charCodeAt(0)
    const index = isNaN(code) ? 0 : code % colors.length
    return colors[index] || colors[0]
}
