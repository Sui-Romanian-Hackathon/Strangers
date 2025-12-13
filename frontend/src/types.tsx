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

