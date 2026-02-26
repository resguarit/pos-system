export interface Service {
    id: number
    name: string
    status: string
    next_due_date: string | null
    billing_cycle: string
    amount: string
    next_billing_cycle?: string | null
    next_amount?: string | null
    service_type?: {
        id: number
        name: string
        billing_cycle: string
        price: string
    } | null
    base_price?: string | null
    discount_percentage?: string | null
    discount_notes?: string | null
    description?: string | null
    start_date?: string
    last_payment?: {
        id: number
        amount: string
        payment_date: string
        notes: string | null
    } | null
}

export type ClientService = Service

export interface Customer {
    id: number
    person: {
        first_name: string
        last_name: string
        email?: string
        phone?: string
    }
    client_services: Service[]
}

export interface Payment {
    id: number
    amount: string
    payment_date: string
    notes: string | null
}

export interface ServiceType {
    id: number
    name: string
    billing_cycle: string
}

export interface Branch {
    id: number
    name: string
}

export interface PaymentMethod {
    id: number
    name: string
    is_active: boolean
}
