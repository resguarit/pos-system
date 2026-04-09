"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Users, SlidersHorizontal, RefreshCw, Plus, Layers, Wallet } from "lucide-react"
import ServicesCustomersView from "@/components/services/ServicesCustomersView"
import ServicesConfigView from "@/components/services/ServicesConfigView"
import AssignServiceDialog from "@/components/services/AssignServiceDialog"
import ServicesGroupedView from "@/components/services/ServicesGroupedView"
import ServicePaymentsPeriodPanel from "@/components/services/ServicePaymentsPeriodPanel"
import ServiceExpiringPanel from "@/components/services/ServiceExpiringPanel"

export default function ServicesManagementPage() {
    const [activeTab, setActiveTab] = useState("customers")
    const [refreshKey, setRefreshKey] = useState(0)
    const [assignDialogOpen, setAssignDialogOpen] = useState(false)

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === "string" ? parseFloat(amount) : amount
        return `$${(Number.isFinite(num) ? num : 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1)
    }

    const handleServiceAssigned = () => {
        setAssignDialogOpen(false)
        handleRefresh()
    }

    return (
        <div className="flex flex-col gap-4 px-4 md:px-6 py-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Servicios</h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        className="h-10 w-10"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setAssignDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Asignar Servicio a Cliente
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="inline-flex h-auto w-fit max-w-full justify-start gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1">
                    <TabsTrigger value="customers" className="flex items-center gap-2 px-3 text-sm">
                        <Users className="h-4 w-4 shrink-0" />
                        <span className="whitespace-nowrap">Estado de Clientes</span>
                    </TabsTrigger>
                    <TabsTrigger value="services" className="flex items-center gap-2 px-3 text-sm">
                        <Layers className="h-4 w-4 shrink-0" />
                        <span className="whitespace-nowrap">Por Servicio</span>
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="flex items-center gap-2 px-3 text-sm">
                        <Wallet className="h-4 w-4 shrink-0" />
                        <span className="whitespace-nowrap">Cobros por período</span>
                    </TabsTrigger>
                    <TabsTrigger value="config" className="flex items-center gap-2 px-3 text-sm">
                        <SlidersHorizontal className="h-4 w-4 shrink-0" />
                        <span className="whitespace-nowrap">Configuración</span>
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Estado de Clientes con Servicios */}
                <TabsContent value="customers" className="mt-4" key={`customers-${refreshKey}`}>
                    <ServicesCustomersView />
                </TabsContent>

                {/* Tab 2: Vista agrupada por servicio */}
                <TabsContent value="services" className="mt-4" key={`services-${refreshKey}`}>
                    <ServicesGroupedView />
                </TabsContent>

                {/* Tab 3: Reporte de cobros por período */}
                <TabsContent value="payments" className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="min-w-0">
                            <ServiceExpiringPanel active={activeTab === "payments"} formatCurrency={formatCurrency} />
                        </div>
                        <div className="min-w-0">
                            <ServicePaymentsPeriodPanel active={activeTab === "payments"} formatCurrency={formatCurrency} />
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 3: Configuración de Servicios (CRUD) */}
                <TabsContent value="config" className="mt-4" key={`config-${refreshKey}`}>
                    <ServicesConfigView />
                </TabsContent>
            </Tabs>

            {/* Dialog para asignar servicio a cliente */}
            <AssignServiceDialog
                open={assignDialogOpen}
                onOpenChange={setAssignDialogOpen}
                onSuccess={handleServiceAssigned}
            />
        </div>
    )
}
