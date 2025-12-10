import { useState, useEffect } from "react";
import { expensesService, ExpenseCategory } from "@/lib/api/expensesService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ExpenseCategories() {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const data = await expensesService.getCategories();
            setCategories(data.data);
        } catch (error) {
            console.error("Error loading categories:", error);
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
                            <th className="p-4 font-medium">Descripción</th>
                            <th className="p-4 font-medium">Estado</th>
                            <th className="p-4 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-4 text-center">Cargando...</td>
                            </tr>
                        ) : categories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-4 text-center">No hay categorías registradas.</td>
                            </tr>
                        ) : (
                            categories.map((category) => (
                                <tr key={category.id} className="border-t">
                                    <td className="p-4 font-medium">{category.name}</td>
                                    <td className="p-4">{category.description || "-"}</td>
                                    <td className="p-4">
                                        <Badge variant={category.active ? "default" : "secondary"}>
                                            {category.active ? "Activa" : "Inactiva"}
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
