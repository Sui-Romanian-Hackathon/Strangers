import { useState } from "react";
import { Box, Button, Heading, Text } from "@radix-ui/themes";
import type { Store, Item } from "./App";
import type { SupplierItem, BatchOffer } from "./types";
import catalog from "./catalog.json";
import { SUPPLIER_IMAGES } from "./assets";

export default function Suppliers({
  stores,
  onBuy,
}: {
  stores: Store[];
  onBuy: (storeId: string, shelfId: string, item: Item) => void;
}) {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(catalog as SupplierItem[]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id ?? null);
  const [selectedShelf, setSelectedShelf] = useState(stores[0]?.shelves?.[0]?.id ?? null);

  const categories = Array.from(new Set(suppliers.map((s) => s.category)));
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? null);

  function applyDiscount(sup: SupplierItem, qty: number): number {
    let discount = 0;

    sup.batchOffers.forEach((o) => {
      if (o.type === "bulk" && qty >= o.minQty) {
        discount = Math.max(discount, o.discountPct);
      }
    });

    return discount;
  }

  return (
    <Box>
      <Heading size="3" mb="2">Suppliers</Heading>

      {/* Categories */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {categories.map((c) => (
          <button
            key={c}
            className={`nav-btn ${activeCategory === c ? "primary" : ""}`}
            onClick={() => setActiveCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {suppliers.filter(s => s.category === activeCategory).map((sup) => (
        <div key={sup.id} className="supplier-item">
          <div style={{ display: "flex", gap: 10 }}>
                      <img
            src={SUPPLIER_IMAGES[sup.img]}
            alt={sup.name}
            style={{ width: 50 }}
          />

            <div>
              <div style={{ fontWeight: 600 }}>{sup.name}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Supplier cost: ${sup.unitCost} — Retail: ${sup.baseRetailPrice} — Available: {sup.qtyAvailable}
              </div>
            </div>
          </div>

          <Button onClick={() => setExpanded(expanded === sup.id ? null : sup.id)}>
            {expanded === sup.id ? "Close" : "Buy"}
          </Button>

          {expanded === sup.id && (
              <div className="collapse">

                {sup.bulkDiscounts && sup.bulkDiscounts.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <strong>Bulk discounts</strong>
                    {sup.bulkDiscounts.map(d => (
                      <div key={d.minQty} className="muted" style={{ fontSize: 13 }}>
                        Buy ≥ {d.minQty} → {d.discountPct}% off
                      </div>
                    ))}
                  </div>
                )}

              <div style={{ display: "flex", gap: 8 }}>
                <select value={selectedStore ?? ""} onChange={(e) => {
                  setSelectedStore(e.target.value);
                  setSelectedShelf(stores.find(s => s.id === e.target.value)?.shelves[0]?.id ?? null);
                }}>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <select value={selectedShelf ?? ""} onChange={(e) => setSelectedShelf(e.target.value)}>
                  {stores.find(s => s.id === selectedStore)?.shelves.map((sh, i) =>
                    <option key={sh.id} value={sh.id}>Shelf {i + 1}</option>
                  )}
                </select>

                <input type="number" id={`qty-${sup.id}`} defaultValue={1} min={1} style={{ width: 70 }} />
                <input type="number" id={`price-${sup.id}`} defaultValue={sup.baseRetailPrice} style={{ width: 80 }} />

                <Button onClick={() => {
                  if (!selectedStore || !selectedShelf) return alert("Select store & shelf");

                  const qty = Number((document.getElementById(`qty-${sup.id}`) as HTMLInputElement).value);
                  const price = Number((document.getElementById(`price-${sup.id}`) as HTMLInputElement).value);

                  if (qty <= 0 || qty > sup.qtyAvailable) return alert("Invalid qty");

                  const discount = applyDiscount(sup, qty);
                  const unitCostPaid = sup.unitCost * (1 - discount / 100);

                  const item: Item = {
                    id: crypto.randomUUID(),
                    name: sup.name,
                    quantity: qty,
                    price,
                    supplier: sup.id,
                    unitCost: unitCostPaid,
                    discountAppliedPct: discount,
                  };

                  onBuy(selectedStore, selectedShelf, item);

                  setSuppliers(prev =>
                    prev.map(s => s.id === sup.id
                      ? { ...s, qtyAvailable: s.qtyAvailable - qty }
                      : s
                    )
                  );

                  setExpanded(null);
                }}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      <Heading size="4" mt="3">Stores & Shelves</Heading>
      {stores.length === 0 && <Text>No stores available.</Text>}
    </Box>
  );
}
