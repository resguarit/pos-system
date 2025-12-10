import { useState, useEffect } from "react";
import { expensesService, Employee } from "@/lib/api/expensesService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EmployeesManagement() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const data = await expensesService.getEmployees();
            setEmployees(data.data);
        } catch (error) {
            console.error("Error loading employees:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="p-4 font-medium">Nombre</th>
                            <th className="p-4 font-medium">Cargo</th>
                            <th className="p-4 font-medium">Sucursal</th>
                            <th className="p-4 font-medium">Salario</th>
                            <th className="p-4 font-medium">Estado</th>
                            <th className="p-4 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="p-4 text-center">Cargando...</td>
                            </tr>
                        ) : employees.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-4 text-center">No hay empleados registrados.</td>
                            </tr>
                        ) : (
                            employees.map((employee) => (
                                <tr key={employee.id} className="border-t">
                                    <td className="p-4">
                                        {employee.person?.first_name} {employee.person?.last_name}
                                    </td>
                                    <td className="p-4">{employee.job_title || "-"}</td>
                                    <td className="p-4">{employee.branch?.name || "-"}</td>
                                    <td className="p-4">${Number(employee.salary).toFixed(2)}</td>
                                    <td className="p-4">
                                        <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                                            {employee.status === "active" ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <Button variant="ghost" size="sm">Editar</Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
