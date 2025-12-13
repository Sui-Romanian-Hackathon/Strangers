import { useState } from "react";
import { Box, Button, Heading, Text } from "@radix-ui/themes";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import type { Store, Item } from "./App";
import type { SupplierItem, BatchOffer } from "./types";
import catalog from "./catalog.json";
import { SUPPLIER_IMAGES } from "./assets";
import { createEscrowOrder } from "./supplychainClient";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";

export default function Suppliers({
  stores,
  onBuy,
}: {
  stores: Store[];
  onBuy: (storeId: string, shelfId: string, item: Item) => void;
}) {
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(catalog as SupplierItem[]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id ?? null);
  const [selectedShelf, setSelectedShelf] = useState(stores[0]?.shelves?.[0]?.id ?? null);
  const [creatingEscrow, setCreatingEscrow] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [orderInputs, setOrderInputs] = useState<{ [supplierId: string]: { qty: number; price: number } }>({});

  // Fetch all SUI coins owned by the account
  const { data: coinsData, isLoading: coinsLoading } = useSuiClientQuery(
    "getCoins",
    {
      owner: account?.address ?? "",
      coinType: "0x2::sui::SUI",
    },
    { enabled: !!account?.address }
  );

  const coins = coinsData?.data ?? [];
  const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance || 0), BigInt(0));

  // Format balance with proper decimals
  const formatSUI = (mist: bigint): string => {
    const suiValue = Number(mist) / 1_000_000_000;
    return suiValue.toFixed(3);
  };


  const categories = Array.from(new Set(suppliers.map((s) => s.category)));
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? null);

  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDragStart(e: React.DragEvent, supId: string) {
    e.dataTransfer.setData("text/supplier", supId);
    setDragging(supId);
  }

  function handleDrop(e: React.DragEvent, storeId: string, shelfId: string) {
    e.preventDefault();
    console.log("Drop", { storeId, shelfId });
    const supId = e.dataTransfer.getData("text/supplier");
    console.log("Supplier ID:", supId);
    const sup = suppliers.find((s) => s.id === supId);
    if (!sup) return;
    const raw = window.prompt(`Enter quantity to add (available: ${sup.qtyAvailable}):`, "1");
    if (!raw) return;
    const q = Number(raw);
    if (!q || q <= 0) return alert("Invalid quantity");
    if (q > sup.qtyAvailable) return alert("Not enough stock at supplier");

    const rawPrice = window.prompt(`Enter price for store (default ${sup.unitCost}):`, String(sup.unitCost));
    if (!rawPrice) return;
    const p = Number(rawPrice);
    if (!p || p < 0) return alert("Invalid price");

    const item: Item = { id: `${Date.now()}-${Math.random()}`, name: sup.name, price: p, quantity: q, supplier: sup.id };
    onBuy(storeId, shelfId, item);
    setSuppliers((prev) => prev.map((s) => (s.id === supId ? { ...s, qty: s.qtyAvailable - q } : s)));
    setDragging(null);
  }

  function applyDiscount(sup: SupplierItem, qty: number): number {
    let discount = 0;

    sup.bulkDiscounts.forEach((o) => {
      if (qty >= o.minQty) {
        discount = Math.max(discount, o.discountPct);
      }
    });

    return discount;
  }

  async function handleCreateEscrowOrder(sup: SupplierItem, qty: number, price: number, supplierId: number) {
    if (!account?.address) {
      alert("Please connect your wallet");
      return;
    }

    if (!selectedStore || !selectedShelf) {
      alert("Select store & shelf");
      return;
    }

    if (!selectedCoin) {
      alert("Select a SUI coin to use");
      return;
    }

   const requiredAmount =
  BigInt(Math.floor(price * qty * 1_000_000_000)); // MIST

    const selectedCoinObj = coins.find(
      (c) => c.coinObjectId === selectedCoin
    );

    if (!selectedCoinObj) {
      alert("Selected coin not found");
      return;
    }

    if (BigInt(selectedCoinObj.balance) < requiredAmount) {
      alert("Insufficient balance");
      return;
    }

    setCreatingEscrow(sup.id);
    try {
      const result = await createEscrowOrder(
        signAndExecuteTransaction,
        account.address,
        supplierId,
        sup.name,
        qty,
        Number(requiredAmount),
        selectedCoin,
        coins,
        SUI_CLOCK_OBJECT_ID
      );
      
      

      // Store order metadata (storeId, shelfId) locally for later use
      if (result.orderId) {
        const orderMetadata = {
          [result.orderId]: { storeId: selectedStore, shelfId: selectedShelf, itemName: sup.name, quantity: qty, price: Number(requiredAmount / 1_000_000_000n) }
        };
        const existing = JSON.parse(localStorage.getItem('escrowOrderMetadata') || '{}');
        console.log("Storing order metadata:", orderMetadata);
        localStorage.setItem('escrowOrderMetadata', JSON.stringify({ ...existing, ...orderMetadata }));
      }
      
      // Reset after successful order
      alert("Escrow order created! Check the 'Escrow Orders' tab to see it.");
      setSelectedCoin(null);
    } catch (err) {
      console.error("Failed to create escrow:", err);
      alert("Failed to create escrow order. See console for details.");
    } finally {
      setCreatingEscrow(null);
    }
  }

  return (
    <Box>
      <Heading size="3" mb="2">Suppliers</Heading>

      {/* Wallet Balance Section */}
      {account?.address && (
        <Box mb="4" style={{ padding: 12, backgroundColor: "#f0f9ff", border: "1px solid #0ea5e9", borderRadius: 6 }}>
          <div style={{ marginBottom: 12 }}>
            <Text weight="bold" size="2">
              💰 Your Testnet SUI Balance
            </Text>
            <Text size="3" style={{ marginTop: 4, color: "#0369a1", fontWeight: "bold" }}>
              {coinsLoading ? "Loading..." : `${formatSUI(totalBalance)} SUI`}
            </Text>
          </div>

          {coins.length > 0 && (
            <div>
              <Text weight="bold" size="2" style={{ marginBottom: 8 }}>
                Select a coin for escrow orders:
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {coins.map((coin) => (
                  <label
                    key={coin.coinObjectId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: 8,
                      border: selectedCoin === coin.coinObjectId ? "2px solid #10b981" : "1px solid #cbd5e1",
                      borderRadius: 4,
                      cursor: "pointer",
                      backgroundColor: selectedCoin === coin.coinObjectId ? "#ecfdf5" : "white",
                    }}
                  >
                    <input
                      type="radio"
                      name="coin-select"
                      value={coin.coinObjectId}
                      checked={selectedCoin === coin.coinObjectId}
                      onChange={(e) => setSelectedCoin(e.target.value)}
                      style={{ marginRight: 10, cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <Text size="2" style={{ fontFamily: "monospace", color: "#666" }}>
                        {coin.coinObjectId.slice(0, 16)}...
                      </Text>
                      <Text weight="bold" size="2" style={{ color: "#10b981" }}>
                        {formatSUI(BigInt(coin.balance || 0))} SUI
                      </Text>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {coins.length === 0 && !coinsLoading && (
            <Text size="2" color="red">
              No SUI coins found. Get testnet SUI from the faucet.
            </Text>
          )}
        </Box>
      )}

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
        draggable
        onDragStart={(e) => handleDragStart(e, sup.id)}
        onDragEnd={() => setDragging(null)}
        style={{
          width: 50,
          cursor: "grab",
          opacity: dragging === sup.id ? 0.5 : 1,
        }}
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
          <select
            value={selectedStore ?? ""}
            onChange={(e) => {
              setSelectedStore(e.target.value);
              setSelectedShelf(
                stores.find(s => s.id === e.target.value)?.shelves[0]?.id ?? null
              );
            }}
          >
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={selectedShelf ?? ""}
            onChange={(e) => setSelectedShelf(e.target.value)}
          >
            {stores.find(s => s.id === selectedStore)?.shelves.map((sh, i) => (
              <option key={sh.id} value={sh.id}>Shelf {i + 1}</option>
            ))}
          </select>

          <input type="number" value={orderInputs[sup.id]?.qty ?? 1} min={1} onChange={(e) => setOrderInputs(prev => ({ ...prev, [sup.id]: { ...prev[sup.id], qty: Number(e.target.value) || 0 } }))} style={{ width: 70 }} />
          <input type="number" value={orderInputs[sup.id]?.price ?? sup.baseRetailPrice} onChange={(e) => setOrderInputs(prev => ({ ...prev, [sup.id]: { ...prev[sup.id], price: Number(e.target.value) || 0 } }))} style={{ width: 80 }} />

          <Button onClick={() => {
            if (!selectedStore || !selectedShelf) return alert("Select store & shelf");

            const qty = orderInputs[sup.id]?.qty ?? 1;
            const price = orderInputs[sup.id]?.price ?? sup.baseRetailPrice;

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
              prev.map(s =>
                s.id === sup.id
                  ? { ...s, qtyAvailable: s.qtyAvailable - qty }
                  : s
              )
            );

            setExpanded(null);
          }}>
            Confirm
          </Button>

          <Button
            onClick={() => {
              const qty = orderInputs[sup.id]?.qty ?? 1;
              const price = orderInputs[sup.id]?.price ?? sup.baseRetailPrice;

              if (qty <= 0 || qty > sup.qtyAvailable) return alert("Invalid qty");

              handleCreateEscrowOrder(sup, qty, price, 1); // TODO: Set correct supplier ID
            }}
            disabled={creatingEscrow === sup.id || !account}
            style={{ backgroundColor: "#10b981" }}
          >
            {creatingEscrow === sup.id ? "Creating..." : "💰 Escrow Order"}
          </Button>
        </div>
      </div>
    )}
  </div>
))}


      <Heading size="4" mt="3">Stores & Shelves</Heading>
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
                                {img ? <img src={SUPPLIER_IMAGES[img]} alt={it.name} style={{ width: 20, height: 20 }} /> : "📦"}
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
