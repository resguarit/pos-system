import { useState, useEffect, useCallback, useMemo } from 'react';
import { getParentCategories, getSubcategoriesByParent, type Category } from '@/lib/api/categoryService';

interface UsePosCategories {
    /** Categorías padre (raíz) */
    parentCategories: Category[];
    /** Subcategorías de la categoría padre seleccionada */
    subcategories: Category[];
    /** ID de la categoría padre seleccionada ("all" = sin filtro) */
    selectedCategoryId: string;
    /** ID de la subcategoría seleccionada ("all" = todas las de la categoría) */
    selectedSubcategoryId: string;
    /** Indica si se están cargando las subcategorías */
    loadingSubcategories: boolean;
    /** Cambiar la categoría padre seleccionada */
    setSelectedCategoryId: (id: string) => void;
    /** Cambiar la subcategoría seleccionada */
    setSelectedSubcategoryId: (id: string) => void;
    /**
     * IDs de categoría por los cuales filtrar productos.
     * - `null` → no filtrar (mostrar todo)
     * - `number[]` → filtrar por esos IDs
     */
    filterCategoryIds: number[] | null;
}

/**
 * Hook que encapsula la lógica de selección en cascada
 * categoría padre → subcategoría para el POS.
 */
export function usePosCategories(): UsePosCategories {
    const [parentCategories, setParentCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryIdState] = useState<string>('all');
    const [selectedSubcategoryId, setSelectedSubcategoryIdState] = useState<string>('all');
    const [loadingSubcategories, setLoadingSubcategories] = useState(false);

    // Cargar categorías padre al montar
    useEffect(() => {
        const fetchParents = async () => {
            try {
                const data = await getParentCategories();
                setParentCategories(Array.isArray(data) ? data : []);
            } catch {
                setParentCategories([]);
            }
        };
        fetchParents();
    }, []);

    // Cargar subcategorías cuando cambia la categoría padre
    useEffect(() => {
        if (selectedCategoryId === 'all') {
            setSubcategories([]);
            return;
        }

        const parentId = Number(selectedCategoryId);
        if (isNaN(parentId)) {
            setSubcategories([]);
            return;
        }

        let cancelled = false;
        const fetchSubs = async () => {
            setLoadingSubcategories(true);
            try {
                const data = await getSubcategoriesByParent(parentId);
                if (!cancelled) {
                    setSubcategories(Array.isArray(data) ? data : []);
                }
            } catch {
                if (!cancelled) setSubcategories([]);
            } finally {
                if (!cancelled) setLoadingSubcategories(false);
            }
        };
        fetchSubs();

        return () => { cancelled = true; };
    }, [selectedCategoryId]);

    // Cambiar categoría padre → resetear subcategoría
    const setSelectedCategoryId = useCallback((id: string) => {
        setSelectedCategoryIdState(id);
        setSelectedSubcategoryIdState('all');
    }, []);

    const setSelectedSubcategoryId = useCallback((id: string) => {
        setSelectedSubcategoryIdState(id);
    }, []);

    // Calcular los IDs de categoría por los cuales filtrar
    const filterCategoryIds = useMemo<number[] | null>(() => {
        // Sin filtro de categoría
        if (selectedCategoryId === 'all') return null;

        const parentId = Number(selectedCategoryId);

        // Subcategoría específica seleccionada
        if (selectedSubcategoryId !== 'all') {
            return [Number(selectedSubcategoryId)];
        }

        // Categoría padre seleccionada sin subcategoría → padre + todas sus hijas
        const childIds = subcategories.map((c) => c.id);
        return [parentId, ...childIds];
    }, [selectedCategoryId, selectedSubcategoryId, subcategories]);

    return {
        parentCategories,
        subcategories,
        selectedCategoryId,
        selectedSubcategoryId,
        loadingSubcategories,
        setSelectedCategoryId,
        setSelectedSubcategoryId,
        filterCategoryIds,
    };
}
