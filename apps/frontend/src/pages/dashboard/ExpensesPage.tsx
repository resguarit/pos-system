import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

import ExpensesDashboard from "./expenses/ExpensesDashboard";
import ExpensesList from "./expenses/ExpensesList";
import EmployeesManagement from "./expenses/EmployeesManagement";
import PayrollSettlement from "./expenses/PayrollSettlement";
import ExpenseCategories from "./expenses/ExpenseCategories";

import { useNavigate, useParams } from "react-router-dom";

export default function ExpensesPage() {
    const navigate = useNavigate();
    const { tab } = useParams();
    const activeTab = tab || "dashboard";

    const handleTabChange = (value: string) => {
        navigate(`/dashboard/gastos/${value}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gastos</h2>
                    <p className="text-muted-foreground">
                        Gestión completa de gastos, empleados y liquidación de sueldos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === "list" && (
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo Gasto
                        </Button>
                    )}
                    {activeTab === "employees" && (
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nuevo Empleado
                        </Button>
                    )}
                    {activeTab === "categories" && (
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nueva Categoría
                        </Button>
                    )}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="list">Listado de Gastos</TabsTrigger>
                    <TabsTrigger value="employees">Empleados</TabsTrigger>
                    <TabsTrigger value="payroll">Liquidación de Sueldos</TabsTrigger>
                    <TabsTrigger value="categories">Categorías</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-4">
                    <ExpensesDashboard />
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gastos Registrados</CardTitle>
                            <CardDescription>
                                Historial de todos los gastos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ExpensesList />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="employees" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestión de Empleados</CardTitle>
                            <CardDescription>
                                Administración de personal y salarios.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmployeesManagement />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payroll" className="space-y-4">
                    <PayrollSettlement />
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Categorías de Gastos</CardTitle>
                            <CardDescription>
                                Configuración de tipos de gastos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ExpenseCategories />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
