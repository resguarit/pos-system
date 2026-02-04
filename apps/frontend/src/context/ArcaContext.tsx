import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useArca, ArcaCertificate, ArcaStatus } from '@/hooks/useArca';

interface ArcaContextType {
    arcaStatus: ArcaStatus | null;
    validCertificates: ArcaCertificate[];
    isLoading: boolean;
    hasCertificateForCuit: (cuit: string | null | undefined) => boolean;
    refreshArcaStatus: () => Promise<void>;
    getCertificateForCuit: (cuit: string | null | undefined) => ArcaCertificate | undefined;
}

const ArcaContext = createContext<ArcaContextType | undefined>(undefined);

export function ArcaProvider({ children }: { children: ReactNode }) {
    const {
        arcaStatus,
        validCertificates,
        loading,
        checkArcaStatus,
        getValidCertificates
    } = useArca();

    // Cargar estado inicial al montar
    useEffect(() => {
        // Estas llamadas ya están controladas dentro de useArca, 
        // pero nos aseguramos de que el contexto tenga datos frescos
        const load = async () => {
            await Promise.all([checkArcaStatus(), getValidCertificates()]);
        };
        load();
    }, [checkArcaStatus, getValidCertificates]);

    const refreshArcaStatus = useCallback(async () => {
        await Promise.all([checkArcaStatus(), getValidCertificates()]);
    }, [checkArcaStatus, getValidCertificates]);

    const getCertificateForCuit = useCallback((cuit: string | null | undefined): ArcaCertificate | undefined => {
        if (!cuit) return undefined;
        const cleanCuit = cuit.replace(/[^0-9]/g, '');
        // validCertificates ya contiene solo certificados válidos (filtrados en useArca)
        // Solo necesitamos buscar por CUIT
        return validCertificates.find(cert => {
            const certCleanCuit = cert.cuit?.replace(/[^0-9]/g, '');
            return certCleanCuit === cleanCuit;
        });
    }, [validCertificates]);

    const hasCertificateForCuit = useCallback((cuit: string | null | undefined): boolean => {
        if (!cuit) return false;
        const cleanCuit = cuit.replace(/[^0-9]/g, '');

        // validCertificates ya contiene SOLO certificados válidos (el hook useArca los filtra)
        // Por lo tanto, si existe un certificado con ese CUIT en el array, es válido
        const found = validCertificates.some(cert => {
            const certCleanCuit = cert.cuit?.replace(/[^0-9]/g, '');
            return certCleanCuit === cleanCuit;
        });

        return found;
    }, [validCertificates]);

    return (
        <ArcaContext.Provider value={{
            arcaStatus,
            validCertificates,
            isLoading: loading,
            hasCertificateForCuit,
            refreshArcaStatus,
            getCertificateForCuit
        }}>
            {children}
        </ArcaContext.Provider>
    );
}

export function useArcaContext() {
    const context = useContext(ArcaContext);
    if (context === undefined) {
        throw new Error('useArcaContext must be used within an ArcaProvider');
    }
    return context;
}

