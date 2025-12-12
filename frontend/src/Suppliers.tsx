import React, { useState } from "react";
import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";
import type { Store, Item } from "./App";
import { SUPPLIER_IMAGES } from "./assets";

const SUPPLIERS_INIT: { id: string; name: string; price: number; qty: number; img: string; category: string }[] = [
  { id: "s1", name: "Apples", price: 1, qty: 100, img: SUPPLIER_IMAGES.s1, category: "Fruits" },
  { id: "s2", name: "Oranges", price: 2, qty: 50, img: SUPPLIER_IMAGES.s2, category: "Fruits" },
  { id: "s3", name: "Milk", price: 3, qty: 30, img: SUPPLIER_IMAGES.s3, category: "Dairy" },
  { id: "s4", name: "Battery Pack", price: 12.5, qty: 20, img: SUPPLIER_IMAGES.s3, category: "Electronics" },
];

export default function Suppliers({
  stores,
  onBuy,
  compact,
}: {
  stores: Store[];
  onBuy: (storeId: string, shelfId: string, item: Item) => void;
  compact?: boolean;
}) {
  const [suppliers, setSuppliers] = useState(SUPPLIERS_INIT);
  const [dragging, setDragging] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(stores[0]?.id ?? null);
  const [selectedShelf, setSelectedShelf] = useState<string | null>(stores[0]?.shelves?.[0]?.id ?? null);
  const categories = Array.from(new Set(suppliers.map((s) => s.category)));
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0] ?? null);

  function handleDragStart(e: React.DragEvent, supId: string) {
    e.dataTransfer.setData("text/supplier", supId);
    setDragging(supId);
  }

  function handleDrop(e: React.DragEvent, storeId: string, shelfId: string) {
    e.preventDefault();
    const supId = e.dataTransfer.getData("text/supplier");
    const sup = suppliers.find((s) => s.id === supId);
    if (!sup) return;
    const raw = window.prompt(`Enter quantity to add (available: ${sup.qty}):`, "1");
    if (!raw) return;
    const q = Number(raw);
    if (!q || q <= 0) return alert("Invalid quantity");
    if (q > sup.qty) return alert("Not enough stock at supplier");

    const rawPrice = window.prompt(`Enter price for store (default ${sup.price}):`, String(sup.price));
    if (!rawPrice) return;
    const p = Number(rawPrice);
    if (!p || p < 0) return alert("Invalid price");

    const item: Item = { id: `${Date.now()}-${Math.random()}`, name: sup.name, price: p, quantity: q, supplier: sup.id };
    onBuy(storeId, shelfId, item);
    setSuppliers((prev) => prev.map((s) => (s.id === supId ? { ...s, qty: s.qty - q } : s)));
    setDragging(null);
  }

  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
  }

  return (
    <Box>
      <Heading size="3" mb="2">
        Suppliers
      </Heading>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }} className="tabs">
        {categories.map((c) => (
          <button key={c} className={`nav-btn ${activeCategory === c ? 'primary' : ''}`} onClick={() => setActiveCategory(c)}>{c}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 12 }}>
        {suppliers.filter(s => s.category === activeCategory).map((sup) => (
          <div key={sup.id} className="supplier-item">
            <div className="supplier-meta">
              <img src={sup.img} alt={sup.name} draggable onDragStart={(e) => handleDragStart(e, sup.id)} className="supplier-img" />
              <div>
                <div style={{ fontWeight: 600 }}>{sup.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>Price: ${sup.price} — Available: {sup.qty}</div>
              </div>
            </div>
            <div>
              <Button onClick={() => setExpanded((s) => (s === sup.id ? null : sup.id))}>{expanded === sup.id ? "Close" : "Buy"}</Button>
            </div>

            {expanded === sup.id && (
              <div className="collapse">
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select value={selectedStore ?? ''} onChange={(e:any)=>{ setSelectedStore(e.target.value); setSelectedShelf(stores.find(s=>s.id===e.target.value)?.shelves?.[0]?.id ?? null)}}>
                    {stores.map(st=> <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                  <select value={selectedShelf ?? ''} onChange={(e:any)=>setSelectedShelf(e.target.value)}>
                    {stores.find(s=>s.id===selectedStore)?.shelves.map(sh=> <option key={sh.id} value={sh.id}>{'Shelf '+(stores.find(s=>s.id===selectedStore)?.shelves.indexOf(sh)!+1)}</option>)}
                  </select>
                  <input type="number" min={1} defaultValue={1} id={`qty-${sup.id}`} style={{ width: 80 }} />
                  <input type="number" min={0} defaultValue={sup.price} id={`price-${sup.id}`} style={{ width: 90 }} />
                  <Button onClick={() => {
                    if (!selectedStore || !selectedShelf) return alert('Select store and shelf');
                    const qEl = document.getElementById(`qty-${sup.id}`) as HTMLInputElement;
                    const pEl = document.getElementById(`price-${sup.id}`) as HTMLInputElement;
                    const q = Number(qEl.value);
                    const p = Number(pEl.value);
                    if (!q || q<=0) return alert('Invalid qty');
                    if (q > sup.qty) return alert('Not enough supplier stock');
                    const item: Item = { id: `${Date.now()}-${Math.random()}`, name: sup.name, price: p, quantity: q, supplier: sup.id };
                    onBuy(selectedStore, selectedShelf, item);
                    setSuppliers(prev=> prev.map(s=> s.id===sup.id? {...s, qty: s.qty - q}: s));
                    setExpanded(null);
                  }}>Confirm</Button>
                </div>

                <div style={{ fontSize: 13 }} className="muted">Or drag the supplier image onto a shelf below to add stock (you will be prompted for qty and price)</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Heading size="4" mt="3">Stores & Shelves (drop here)</Heading>
      {stores.length === 0 ? (
        <Text>No stores available. Create a store in Admin.</Text>
      ) : (
        stores.map((st) => (
          <Box key={st.id} mb="3" style={{ border: "1px solid var(--gray-a3)", padding: 12 }}>
            <Text>{st.name}</Text>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {st.shelves.map((sh, idx) => (
                <div
                  key={sh.id}
                  onDragOver={allowDrop}
                  onDrop={(e) => handleDrop(e, st.id, sh.id)}
                  style={{ width: 120, minHeight: 100, border: "1px dashed var(--gray-a2)", padding: 8, background: "white" }}
                >
                    <div style={{ fontSize: 18, minHeight: 28, color: "#111" }}>
                      {sh.items.length === 0 ? (
                        "🗂️"
                      ) : (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {sh.items.slice(0, 3).map((it) => {
                            const sId = it.supplier;
                            const sup = suppliers.find((s) => s.id === sId);
                            const img = sup ? sup.img : undefined;
                            return (
                              <div key={it.id} title={`${it.name} x${it.quantity}`} style={{ fontSize: 18 }}>
                                {img ? <img src={img} alt={it.name} style={{ width: 20, height: 20 }} /> : "📦"}
                              </div>
                            );
                          })}
                          {sh.items.length > 3 && <div style={{ fontSize: 12 }}>+{sh.items.length - 3}</div>}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#111" }}>
                      Shelf {idx + 1}
                      <div>
                        {sh.items.map((it) => (
                          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", color: "#111", padding: "2px 0" }}>
                            <div style={{ color: "#111" }}>{it.name} x{it.quantity}</div>
                            <div style={{ color: "#111", fontWeight: 600 }}>${typeof it.price === "number" && it.price.toFixed ? it.price.toFixed(2) : it.price}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                </div>
              ))}
            </div>
          </Box>
        ))
      )}
    </Box>
  );
}
