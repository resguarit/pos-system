import { useState, useEffect } from "react";
import { expensesService, Expense } from "@/lib/api/expensesService";
import { DataTable } from "@/components/ui/data-table"; // Assuming a generic DataTable exists or I'll use a simple table
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ExpensesList() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const data = await expensesService.getExpenses();
            setExpenses(data.data); // Assuming paginated response structure
        } catch (error) {
            console.error("Error loading expenses:", error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            accessorKey: "date",
            header: "Fecha",
            cell: ({ row }: any) => format(new Date(row.original.date), "dd/MM/yyyy"),
        },
        {
            accessorKey: "description",
            header: "Descripción",
        },
        {
            accessorKey: "category.name",
            header: "Categoría",
        },
        {
            accessorKey: "amount",
            header: "Monto",
            cell: ({ row }: any) => `$${row.original.amount.toFixed(2)}`,
        },
        {
            accessorKey: "status",
            header: "Estado",
            cell: ({ row }: any) => (
                <Badge variant={row.original.status === "paid" ? "default" : "secondary"}>
                    {row.original.status}
                </Badge>
            ),
        },
        {
            id: "actions",
            cell: ({ row }: any) => (
                <Button variant="ghost" size="sm">
                    Ver
                </Button>
            ),
        },
    ];

    // If DataTable doesn't exist, I'll render a simple table.
    // For now, I'll assume I need to build a simple table if I don't find DataTable.
    // I'll check if DataTable exists first.

    return (
        <div className="space-y-4">
            {/* Filters here */}
            <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="p-4 font-medium">Fecha</th>
                            <th className="p-4 font-medium">Descripción</th>
                            <th className="p-4 font-medium">Categoría</th>
                            <th className="p-4 font-medium">Monto</th>
                            <th className="p-4 font-medium">Estado</th>
                            <th className="p-4 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="p-4 text-center">Cargando...</td>
                            </tr>
                        ) : expenses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-4 text-center">No hay gastos registrados.</td>
                            </tr>
                        ) : (
                            expenses.map((expense) => (
                                <tr key={expense.id} className="border-t">
                                    <td className="p-4">{format(new Date(expense.date), "dd/MM/yyyy")}</td>
                                    <td className="p-4">{expense.description}</td>
                                    <td className="p-4">{expense.category?.name || "-"}</td>
                                    <td className="p-4 font-medium">${Number(expense.amount).toFixed(2)}</td>
                                    <td className="p-4">
                                        <Badge variant={expense.status === "paid" ? "default" : "secondary"}>
                                            {expense.status === "paid" ? "Pagado" : expense.status === "pending" ? "Pendiente" : expense.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <Button variant="ghost" size="sm">Ver</Button>
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
