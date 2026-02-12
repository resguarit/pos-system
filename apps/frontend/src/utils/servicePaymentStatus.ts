export type ServicePaymentStatus = "active" | "due_soon" | "expired" | "inactive"

type ServicePaymentStatusInput = {
    status: string
    next_due_date?: string | null
    billing_cycle?: string | null
}

export const getServicePaymentStatus = (
    service: ServicePaymentStatusInput
): ServicePaymentStatus => {
    if (service.status !== "active") return "inactive"

    if (!service.next_due_date) {
        if (service.billing_cycle === "one_time") return "active"
        return "active"
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(service.next_due_date)
    dueDate.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return "expired"
    if (diffDays <= 15) return "due_soon"
    return "active"
}
