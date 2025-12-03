/**
 * Stock Transfer Types
 * Strict typing for stock transfer module
 */

// Branch type compatible with API response
export interface Branch {
  id: number | string;
  description?: string;
  name?: string;
  color?: string;
  status?: boolean;
}

// Product type compatible with API response
export interface Product {
  id: number | string;
  description: string;
  code?: string | null;
  barcode?: string | null;
}

export interface TransferItem {
  product_id: number;
  quantity: number;
  availableStock?: number;
  product?: Product;
}

export interface TransferFormData {
  source_branch_id: string;
  destination_branch_id: string;
  transfer_date: Date;
  notes: string;
}

export interface CreateTransferPayload {
  source_branch_id: number;
  destination_branch_id: number;
  transfer_date: string;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
}

export interface StockInfo {
  product_id: number;
  branch_id: number;
  current_stock: number;
}

export type TransferStatus = 'pending' | 'completed' | 'cancelled';

export interface StockTransfer {
  id: number;
  source_branch_id: number;
  destination_branch_id: number;
  transfer_date: string;
  status: TransferStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  source_branch?: Branch;
  destination_branch?: Branch;
  items?: TransferItem[];
}
