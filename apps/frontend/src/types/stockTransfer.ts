export interface StockTransferItem {
  id?: number;
  stock_transfer_id?: number;
  product_id: number;
  quantity: number;
  product?: {
    id: number;
    description: string;
    barcode?: string;
    sku?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface StockTransfer {
  id?: number;
  source_branch_id: number;
  destination_branch_id: number;
  transfer_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  items: StockTransferItem[];
  user_id?: number;
  user?: {
    id: number;
    name?: string;
    username?: string;
    email?: string;
  };
  sourceBranch?: {
    id: number;
    name: string;
    address?: string;
  };
  destinationBranch?: {
    id: number;
    name: string;
    address?: string;
  };
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateStockTransferRequest {
  source_branch_id: number;
  destination_branch_id: number;
  transfer_date: string;
  notes?: string;
  items: {
    product_id: number;
    quantity: number;
  }[];
}

export interface UpdateStockTransferRequest {
  source_branch_id?: number;
  destination_branch_id?: number;
  transfer_date?: string;
  notes?: string;
  items?: {
    product_id: number;
    quantity: number;
  }[];
}

export interface StockTransferFilters {
  source_branch_id?: number;
  destination_branch_id?: number;
  branch_id?: number;
  status?: 'pending' | 'completed' | 'cancelled';
  from?: string;
  to?: string;
}
