import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useAfip, AfipCertificate, AfipStatus } from '@/hooks/useAfip';

interface AfipContextType {
    afipStatus: AfipStatus | null;
    validCertificates: AfipCertificate[];
    isLoading: boolean;
    hasCertificateForCuit: (cuit: string | null | undefined) => boolean;
    refreshAfipStatus: () => Promise<void>;
    getCertificateForCuit: (cuit: string | null | undefined) => AfipCertificate | undefined;
}

const AfipContext = createContext<AfipContextType | undefined>(undefined);

export function AfipProvider({ children }: { children: ReactNode }) {
    const {
        afipStatus,
        validCertificates,
        loading,
        checkAfipStatus,
        getValidCertificates
    } = useAfip();

    // Cargar estado inicial al montar
    useEffect(() => {
        // Estas llamadas ya están controladas dentro de useAfip, 
        // pero nos aseguramos de que el contexto tenga datos frescos
        const load = async () => {
            await Promise.all([checkAfipStatus(), getValidCertificates()]);
        };
        load();
    }, [checkAfipStatus, getValidCertificates]);

    const refreshAfipStatus = useCallback(async () => {
        await Promise.all([checkAfipStatus(), getValidCertificates()]);
    }, [checkAfipStatus, getValidCertificates]);

    const getCertificateForCuit = useCallback((cuit: string | null | undefined): AfipCertificate | undefined => {
        if (!cuit) return undefined;
        const cleanCuit = cuit.replace(/[^0-9]/g, '');
        // validCertificates ya contiene solo certificados válidos (filtrados en useAfip)
        // Solo necesitamos buscar por CUIT
        return validCertificates.find(cert => {
            const certCleanCuit = cert.cuit?.replace(/[^0-9]/g, '');
            return certCleanCuit === cleanCuit;
        });
    }, [validCertificates]);

    const hasCertificateForCuit = useCallback((cuit: string | null | undefined): boolean => {
        if (!cuit) return false;
        const cleanCuit = cuit.replace(/[^0-9]/g, '');
        
        // validCertificates ya contiene SOLO certificados válidos (el hook useAfip los filtra)
        // Por lo tanto, si existe un certificado con ese CUIT en el array, es válido
        const found = validCertificates.some(cert => {
            const certCleanCuit = cert.cuit?.replace(/[^0-9]/g, '');
            return certCleanCuit === cleanCuit;
        });
        
        return found;
    }, [validCertificates]);

    return (
        <AfipContext.Provider value={{
            afipStatus,
            validCertificates,
            isLoading: loading,
            hasCertificateForCuit,
            refreshAfipStatus,
            getCertificateForCuit
        }}>
            {children}
        </AfipContext.Provider>
    );
}

export function useAfipContext() {
    const context = useContext(AfipContext);
    if (context === undefined) {
        throw new Error('useAfipContext must be used within an AfipProvider');
    }
    return context;
}
