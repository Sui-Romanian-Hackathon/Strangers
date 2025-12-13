export type BatchOffer =
  | { type: "bulk"; minQty: number; discountPct: number }
  | { type: "timed"; availableInDays: number; discountPct: number };

export type SupplierItem = {
  id: string;
  name: string;
  category: string;
  unitCost: number;
  baseRetailPrice: number;
  qtyAvailable: number;
  img: string;
  batchOffers: BatchOffer[];
};
