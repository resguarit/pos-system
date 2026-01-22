"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Users, Settings, RefreshCw, Plus } from "lucide-react"
import ServicesCustomersView from "@/components/services/ServicesCustomersView"
import ServicesConfigView from "@/components/services/ServicesConfigView"
import AssignServiceDialog from "@/components/services/AssignServiceDialog"

export default function ServicesManagementPage() {
    const [activeTab, setActiveTab] = useState("customers")
    const [refreshKey, setRefreshKey] = useState(0)
    const [assignDialogOpen, setAssignDialogOpen] = useState(false)

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
                <TabsList className="grid w-full max-w-md grid-cols-2 h-11">
                    <TabsTrigger value="customers" className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        Estado de Clientes
                    </TabsTrigger>
                    <TabsTrigger value="config" className="flex items-center gap-2 text-sm">
                        <Settings className="h-4 w-4" />
                        Configuración de Servicios
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Estado de Clientes con Servicios */}
                <TabsContent value="customers" className="mt-4" key={`customers-${refreshKey}`}>
                    <ServicesCustomersView />
                </TabsContent>

                {/* Tab 2: Configuración de Servicios (CRUD) */}
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
