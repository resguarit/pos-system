import api from '../api';

export interface PriceListExportOptions {
  categoryIds?: number[];
  branchIds?: number[];
  includeInactiveProducts?: boolean;
  includeOutOfStockProducts?: boolean;
}

export interface StockCountExportOptions extends PriceListExportOptions {
  supplierIds?: number[];
  format?: 'pdf' | 'xlsx';
}

export const priceListService = {
  /**
   * Exporta la lista de precios en PDF
   */
  async exportPriceList(options: PriceListExportOptions = {}) {
    try {
      const params = new URLSearchParams();

      if (options.categoryIds && options.categoryIds.length > 0) {
        options.categoryIds.forEach(id => params.append('category_ids[]', id.toString()));
      }

      if (options.branchIds && options.branchIds.length > 0) {
        options.branchIds.forEach(id => params.append('branch_ids[]', id.toString()));
      }

      if (options.includeInactiveProducts) {
        params.append('include_inactive', '1');
      }

      if (options.includeOutOfStockProducts) {
        params.append('include_out_of_stock', '1');
      }

      const apiUrl = `/products/export/price-list?${params.toString()}`;

      const response = await api.get(apiUrl, {
        responseType: 'blob',
      });

      // Crear blob y descargar
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;

      const date = new Date().toISOString().split('T')[0];
      a.download = `lista-precios-ars-${date}.pdf`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      return true;
    } catch (error) {
      console.error('Error al exportar lista de precios:', error);
      throw error;
    }
  },

  /**
   * Exporta la planilla de conteo de stock en PDF
   */
  async exportStockCountList(options: StockCountExportOptions = {}) {
    try {
      const params = new URLSearchParams();

      if (options.categoryIds && options.categoryIds.length > 0) {
        options.categoryIds.forEach(id => params.append('category_ids[]', id.toString()));
      }

      if (options.branchIds && options.branchIds.length > 0) {
        options.branchIds.forEach(id => params.append('branch_ids[]', id.toString()));
      }

      if (options.supplierIds && options.supplierIds.length > 0) {
        options.supplierIds.forEach(id => params.append('supplier_ids[]', id.toString()));
      }

      if (options.includeInactiveProducts) {
        params.append('include_inactive', '1');
      }

      if (options.includeOutOfStockProducts) {
        params.append('include_out_of_stock', '1');
      }

      params.append('format', options.format || 'pdf');

      const apiUrl = `/products/export/stock-count?${params.toString()}`;

      const response = await api.get(apiUrl, {
        responseType: 'blob',
      });

      const outputFormat = options.format || 'pdf';
      const mimeType = outputFormat === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      // Crear blob y descargar
      const blob = new Blob([response.data], { type: mimeType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;

      const date = new Date().toISOString().split('T')[0];
      a.download = `planilla-conteo-${date}.${outputFormat}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      return true;
    } catch (error) {
      console.error('Error al exportar planilla de conteo:', error);
      throw error;
    }
  },

  /**
   * Obtiene la URL para previsualizar la lista de precios
   */
  getPriceListUrl(options: PriceListExportOptions = {}): string {
    const params = new URLSearchParams();

    if (options.categoryIds && options.categoryIds.length > 0) {
      options.categoryIds.forEach(id => params.append('category_ids[]', id.toString()));
    }

    if (options.branchIds && options.branchIds.length > 0) {
      options.branchIds.forEach(id => params.append('branch_ids[]', id.toString()));
    }

    if (options.includeInactiveProducts) {
      params.append('include_inactive', '1');
    }

    if (options.includeOutOfStockProducts) {
      params.append('include_out_of_stock', '1');
    }

    return `/api/products/export/price-list?${params.toString()}`;
  }
};

export default priceListService;
