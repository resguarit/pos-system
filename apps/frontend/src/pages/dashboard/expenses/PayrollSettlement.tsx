import { useState } from "react";
import { expensesService } from "@/lib/api/expensesService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function PayrollSettlement() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        payment_date: new Date().toISOString().split('T')[0],
        branch_id: "",
        category_id: "", // Should fetch payroll category ID
    });

    const handleGenerate = async () => {
        try {
            setLoading(true);
            // Need to fetch category ID for "Sueldos" or let user select
            // For now, assuming user selects or we hardcode if we knew it
            await expensesService.generatePayroll(formData);
            toast({
                title: "Liquidación generada",
                description: "Los gastos de nómina se han generado correctamente.",
            });
        } catch (error) {
            console.error("Error generating payroll:", error);
            toast({
                title: "Error",
                description: "No se pudo generar la liquidación.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Generar Liquidación de Sueldos</CardTitle>
                    <CardDescription>
                        Seleccione el período y la sucursal para generar los gastos de nómina automáticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Mes</Label>
                            <Select
                                value={formData.month.toString()}
                                onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                                            {new Date(0, i).toLocaleString('es', { month: 'long' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Año</Label>
                            <Input
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Fecha de Pago</Label>
                        <Input
                            type="date"
                            value={formData.payment_date}
                            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        />
                    </div>

                    {/* Branch selector would go here, fetching branches */}

                    <Button className="w-full" onClick={handleGenerate} disabled={loading}>
                        {loading ? "Generando..." : "Generar Liquidación"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
