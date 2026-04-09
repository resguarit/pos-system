import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper";
import RepairDetailPanelV2 from "@/components/repairs/RepairDetailPanelV2";
import { useRepairs } from "@/hooks/useRepairs";
import type { Repair } from "@/types/repairs";
import { ArrowLeft } from "lucide-react";

type LocationState = {
    edit?: boolean;
    tab?: "details" | "financials" | "notes";
};

export default function ReparacionDetallePage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { hasPermission } = useAuth();

    const state = (location.state || {}) as LocationState;

    const repairId = useMemo(() => {
        const parsed = Number(id);
        return Number.isFinite(parsed) ? parsed : null;
    }, [id]);

    const {
        getRepair,
        updateRepair,
        addNote,
        refresh,
        downloadPdf,
        downloadReceptionCertificate,
        downloadNoRepairCertificate,
        options,
    } = useRepairs({ autoFetch: false });

    const [repair, setRepair] = useState<Repair | null>(null);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(!!state.edit);
    const [defaultTab, setDefaultTab] = useState<"details" | "financials" | "notes">(state.tab ?? "details");

    useEffect(() => {
        setEditMode(!!state.edit);
        setDefaultTab(state.tab ?? "details");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (!repairId) return;
        let cancelled = false;
        setLoading(true);
        getRepair(repairId)
            .then((r) => {
                if (!cancelled) setRepair(r);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [repairId, getRepair]);

    const handleSaveRepair = async (data: Partial<Repair>, notes?: string[]) => {
        if (!repairId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateRepair(repairId, data as any);

        const refreshed = await getRepair(repairId);
        if (refreshed) {
            setRepair(refreshed);

            if (notes && notes.length > 0) {
                for (const note of notes) {
                    await addNote(repairId, note);
                }
                const finalRefresh = await getRepair(repairId);
                if (finalRefresh) setRepair(finalRefresh);
            }

            setEditMode(false);
            refresh();
        }
    };

    const handleQuickAddNote = async (note: string): Promise<boolean> => {
        if (!repairId) return false;
        const saved = await addNote(repairId, note);
        if (saved) {
            const refreshed = await getRepair(repairId);
            setRepair(refreshed);
            refresh();
        }
        return saved;
    };

    const canEdit = hasPermission("editar_reparaciones");

    return (
        <BranchRequiredWrapper
            title="Selecciona una sucursal"
            description="Las reparaciones necesitan una sucursal seleccionada para funcionar correctamente."
            allowMultipleBranches={true}
        >
            <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" asChild>
                            <Link to="/dashboard/reparaciones">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Volver</span>
                            </Link>
                        </Button>
                        <h2 className="text-3xl font-bold tracking-tight">
                            {editMode && canEdit ? "Editar Reparación" : "Ver Reparación"}
                        </h2>
                    </div>
                </div>

                <RepairDetailPanelV2
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) navigate("/dashboard/reparaciones");
                    }}
                    repair={repair}
                    loading={loading}
                    editMode={editMode && canEdit}
                    onSave={canEdit ? handleSaveRepair : undefined}
                    onCancelEdit={() => setEditMode(false)}
                    onPaymentSuccess={() => refresh()}
                    onQuickAddNote={handleQuickAddNote}
                    defaultTab={defaultTab}
                    onDownloadPdf={repair ? () => downloadPdf(repair.id) : undefined}
                    onDownloadReceptionCertificate={
                        repair ? () => downloadReceptionCertificate(repair.id) : undefined
                    }
                    onDownloadNoRepairCertificate={
                        repair ? () => downloadNoRepairCertificate(repair.id) : undefined
                    }
                    options={options}
                />
            </div>
        </BranchRequiredWrapper>
    );
}

