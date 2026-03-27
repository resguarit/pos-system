import api from '../api';
import { format } from 'date-fns';

interface SoldProduct {
    id: number;
    code: string;
    name: string;
    category: string;
    category_id: number;
    quantity: number;
    availableStock: number;
}

interface GetSoldProductsParams {
    destination_branch_id: string;
    from_date: Date;
    to_date: Date;
    /** Array of category IDs to filter (parent + children from cascaded selection) */
    category_ids?: number[];
}

/**
 * Get sold products aggregated for stock transfer
 */
export async function getSoldProductsForTransfer(params: GetSoldProductsParams): Promise<SoldProduct[]> {
    const response = await api.get<{ success: boolean; data: SoldProduct[] }>(
        '/sales/sold-products-for-transfer',
        {
            params: {
                destination_branch_id: params.destination_branch_id,
                from_date: format(params.from_date, 'yyyy-MM-dd'),
                to_date: format(params.to_date, 'yyyy-MM-dd'),
                ...(params.category_ids?.length ? { 'category_ids[]': params.category_ids } : {}),
            },
        }
    );

    return response.data.data;
}

export const saleService = {
    getSoldProductsForTransfer,
};
