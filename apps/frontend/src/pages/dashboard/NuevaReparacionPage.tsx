import { useBranch } from "@/context/BranchContext";
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useRepairs } from "@/hooks/useRepairs";
import NewRepairPanel from "@/components/repairs/NewRepairPanel";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NuevaReparacionPage() {
    const navigate = useNavigate();
    const { selectedBranchIds } = useBranch();
    const { createRepair, refresh, options } = useRepairs({ autoFetch: false });
    const [creating, setCreating] = useState(false);

    const branchId =
        selectedBranchIds && selectedBranchIds[0] && selectedBranchIds[0] !== "all"
            ? selectedBranchIds[0]
            : null;

    const handleCreateRepair = async (data: Parameters<typeof createRepair>[0]) => {
        setCreating(true);
        try {
            const repair = await createRepair(data);
            if (repair) {
                refresh();
                navigate(`/dashboard/reparaciones/${repair.id}`, { state: { edit: false } });
                return true;
            }
            return false;
        } finally {
            setCreating(false);
        }
    };

    return (
        <BranchRequiredWrapper
            title="Selecciona una sucursal"
            description="Las reparaciones necesitan una sucursal seleccionada para funcionar correctamente."
            allowMultipleBranches={true}
        >
            <div className="flex justify-center items-start min-h-[80vh] w-full">
                <div className="w-full">
                    <div className="space-y-4 p-4 pt-16 md:p-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" asChild>
                                    <Link to="/dashboard/reparaciones">
                                        <ArrowLeft className="h-4 w-4" />
                                        <span className="sr-only">Volver</span>
                                    </Link>
                                </Button>
                                <h2 className="text-3xl font-bold tracking-tight">Nueva Reparación</h2>
                            </div>

                            <Button type="submit" form="new-repair-form" disabled={creating}>
                                {creating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Crear Reparación
                                    </>
                                )}
                            </Button>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Datos de la reparación</CardTitle>
                                <CardDescription>
                                    Completá los datos de la reparación. Los campos marcados con <span className="text-red-500">*</span> son obligatorios.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <NewRepairPanel
                                    open={true}
                                    onOpenChange={() => { }}
                                    onSubmit={handleCreateRepair}
                                    branchId={branchId}
                                    options={options}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </BranchRequiredWrapper>
    );
}

