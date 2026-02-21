import { useState, useCallback, useEffect } from 'react';
import useApi from './useApi';

export interface Transporter {
    id: number;
    email: string;
    person_id: number | null;
    person?: {
        id: number;
        first_name: string;
        last_name: string;
    } | null;
}

export function useTransporters() {
    const { request } = useApi();
    const [transporters, setTransporters] = useState<Transporter[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransporters = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await request({
                method: 'GET',
                url: '/users/transporters'
            });

            if (response && response.data) {
                setTransporters(response.data);
            }
        } catch (err) {
            console.error('Error fetching transporters:', err);
            setError('Error al cargar la lista de transportistas.');
        } finally {
            setLoading(false);
        }
    }, [request]);

    useEffect(() => {
        fetchTransporters();
    }, [fetchTransporters]);

    return {
        transporters,
        loading,
        error,
        refresh: fetchTransporters
    };
}
