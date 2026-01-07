import api from '@/lib/api';

export interface PriceUpdatePreview {
    can_update: boolean;
    sale_id: number;
    receipt_number: string;
    customer_name: string;
    items: PriceUpdateItem[];
    old_subtotal: number;
    new_subtotal: number;
    old_total_iva: number;
    new_total_iva: number;
    old_total: number;
    new_total: number;
    difference: number;
    paid_amount: number;
    old_pending: number;
    new_pending: number;
}

export interface PriceUpdateItem {
    id: number;
    product_name: string;
    quantity: number;
    old_price: number;
    new_price: number;
    price_change: number;
    price_change_percentage: number;
    old_total: number;
    new_total: number;
}

export interface BatchPriceUpdatePreview {
    customers: BatchCustomerGroup[];
    total_sales_with_changes: number;
    grand_total_difference: number;
    customers_affected: number;
}

export interface BatchCustomerGroup {
    customer_id: number | null;
    customer_name: string;
    sales: BatchSalePreview[];
    total_difference: number;
}

export interface BatchSalePreview {
    sale_id: number;
    receipt_number: string;
    date: string;
    old_total: number;
    new_total: number;
    difference: number;
    paid_amount: number;
    old_pending: number;
    new_pending: number;
    items_count: number;
}

export interface UpdatePriceResult {
    success: boolean;
    sale_id: number;
    receipt_number: string;
    old_total: number;
    new_total: number;
    difference: number;
    paid_amount: number;
    old_pending: number;
    new_pending: number;
    message: string;
}

export interface BatchUpdateResult {
    success: boolean;
    updated: number;
    failed: number;
    total_difference: number;
    details: UpdatePriceResult[];
    errors: Array<{ sale_id: number; error: string }>;
    message: string;
}

export class UpdateSalePricesService {
    /**
     * Obtener vista previa de actualización de precio para una venta individual
     */
    static async previewSalePriceUpdate(
        accountId: number,
        saleId: number
    ): Promise<PriceUpdatePreview> {
        const response = await api.get(
            `/current-accounts/${accountId}/sales/${saleId}/price-preview`
        );
        return response.data.data;
    }

    /**
     * Aplicar actualización de precio a una venta individual
     */
    static async updateSalePrice(
        accountId: number,
        saleId: number
    ): Promise<UpdatePriceResult> {
        const response = await api.post(
            `/current-accounts/${accountId}/sales/${saleId}/update-price`
        );
        return response.data.data;
    }

    /**
     * Obtener vista previa de actualización masiva de precios
     * @param accountId - ID de la cuenta corriente (null para todos los clientes)
     */
    static async previewBatchPriceUpdate(
        accountId: number | null = null
    ): Promise<BatchPriceUpdatePreview> {
        const endpoint = accountId
            ? `/current-accounts/${accountId}/sales/batch-price-preview`
            : `/sales/batch-price-preview`;

        const response = await api.get(endpoint);
        return response.data.data;
    }

    /**
      * Aplicar actualización masiva de precios
      */
    static async batchUpdatePrices(saleIds: number[]): Promise<BatchUpdateResult> {
        const response = await api.post(`/sales/batch-update-prices`, {
            sale_ids: saleIds,
        });
        return response.data.data;
    }
}
