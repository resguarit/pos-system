import { useState, useEffect } from "react";
import { expensesService, ExpenseCategory } from "@/lib/api/expensesService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Plus, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ExpenseCategories() {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState<number[]>([]);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const data = await expensesService.getCategoriesTree();
            setCategories(data.data);
        } catch (error) {
            console.error("Error loading categories:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedCategories(prev =>
            prev.includes(id) ? prev.filter(catId => catId !== id) : [...prev, id]
        );
    };

    const renderCategoryRow = (category: ExpenseCategory, level: number = 0) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedCategories.includes(category.id);

        return (
            <>
                <tr key={category.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
                            {hasChildren ? (
                                <button onClick={() => toggleExpand(category.id)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                            ) : (
                                <div className="w-6" /> // spacer
                            )}
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                                {category.icon || (level === 0 ? '📁' : '📄')}
                            </div>
                            <span className={cn("font-medium", level === 0 ? "text-base" : "text-sm")}>
                                {category.name}
                            </span>
                        </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{category.description || "-"}</td>
                    <td className="p-4">
                        <Badge variant={category.active ? "default" : "secondary"}>
                            {category.active ? "Activa" : "Inactiva"}
                        </Badge>
                    </td>
                    <td className="p-4">
                        <div className="flex items-center gap-2">
                            {level === 0 && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500">
                                <Edit className="h-4 w-4" />
                            </Button>
                            {!hasChildren && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </td>
                </tr>
                {isExpanded && hasChildren && category.children!.map(child => renderCategoryRow(child, level + 1))}
            </>
        );
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-card">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-sm uppercase">
                        <tr>
                            <th className="p-4 font-medium w-[40%]">Nombre</th>
                            <th className="p-4 font-medium w-[30%]">Descripción</th>
                            <th className="p-4 font-medium w-[15%]">Estado</th>
                            <th className="p-4 font-medium w-[15%]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-muted-foreground">Cargando categorías...</td>
                            </tr>
                        ) : categories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-muted-foreground">No hay categorías registradas.</td>
                            </tr>
                        ) : (
                            categories.map(category => renderCategoryRow(category))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
