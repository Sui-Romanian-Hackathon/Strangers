export type BulkDiscount = {
  minQty: number;
  discountPct: number;
};

export type SupplierItem = {
  id: string;
  name: string;
  category: string;

  unitCost: number;
  baseRetailPrice: number;
  qtyAvailable: number;

  img: string;

  bulkDiscounts: BulkDiscount[];
};

export type Order = {
  id: string;
  store_address: string;
  supplier_id: number;
  item_name: string;
  quantity: number;
  total_price: number;
  created_at: number;
  release_delay: number;
  time_until_release: number; // calculated client-side in ms
  storeId?: string; // For tracking which store this order belongs to
  shelfId?: string; // For tracking which shelf to add items to
};

