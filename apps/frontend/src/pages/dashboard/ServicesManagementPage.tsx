"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe, Users, Settings } from "lucide-react"
import ServicesCustomersView from "@/components/services/ServicesCustomersView"
import ServicesConfigView from "@/components/services/ServicesConfigView"

export default function ServicesManagementPage() {
    const [activeTab, setActiveTab] = useState("customers")

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                        <Globe className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestión de Servicios</h1>
                        <p className="text-sm text-gray-500">Administra los servicios de tus clientes</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="customers" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Estado de Clientes
                    </TabsTrigger>
                    <TabsTrigger value="config" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Configuración de Servicios
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Estado de Clientes con Servicios */}
                <TabsContent value="customers" className="mt-6">
                    <ServicesCustomersView />
                </TabsContent>

                {/* Tab 2: Configuración de Servicios (CRUD) */}
                <TabsContent value="config" className="mt-6">
                    <ServicesConfigView />
                </TabsContent>
            </Tabs>
        </div>
    )
}
