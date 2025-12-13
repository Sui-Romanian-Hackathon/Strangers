import React, { useState } from "react";
import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import type { Store } from "./App";
import { SUPPLIER_IMAGES } from "./assets";

export default function Admin({
  stores,
  onAddStore,
}: {
  stores: Store[];
  onAddStore: (name: string, shelfCount: number) => void;
}) {
  const [name, setName] = useState("");
  const [shelves, setShelves] = useState(3);
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  async function createShopChain() {
    if (!account) return alert("Connect wallet first");
    if (!name) return alert("Enter a store name first");
    try {
      const { createShopOnChain } = await import("./supplychainClient");
      const res = await createShopOnChain(signAndExecuteTransaction, name, shelves);
      alert("Transaction submitted: " + JSON.stringify(res));
    } catch (e: any) {
      alert("Error creating shop on-chain: " + (e?.message ?? String(e)));
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <Heading size="3" style={{ margin: 0 }}>Admin — Stores</Heading>
          <div className="muted" style={{ fontSize: 13 }}>Create stores and visualize shelves</div>
        </div>
        <div>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Store name" style={{ padding: 8, borderRadius: 8, border: "1px solid #e6e9ee" }} />
            <input type="number" min={1} value={shelves} onChange={(e: any) => setShelves(Number(e.target.value))} style={{ width: 80, padding: 8, borderRadius: 8, border: "1px solid #e6e9ee" }} />
            {/* <Button onClick={() => { if (!name) return; onAddStore(name, Math.max(1, shelves)); setName(""
            ); }}>Add Store</Button>
            <Button onClick={createShopChain} style={{ marginLeft: 8 }}>Create Shop on-chain</Button> */}
              <Button
              onClick={async () => {
                if (!name) return;

                onAddStore(name, Math.max(1, shelves));

                try {
                  if (!account) return alert("Connect wallet first");
                  const { createShopOnChain } = await import("./supplychainClient");
                  const res = await createShopOnChain(signAndExecuteTransaction, name, shelves);
                  alert("Transaction submitted: " + JSON.stringify(res));
                  setName("");
                  setShelves(3);
                } catch (e: any) {
                  alert("Error creating shop on-chain: " + (e?.message ?? String(e)));
                }
              }}
              style={{ marginLeft: 8 }}
            >
              Create Shop on-chain
            </Button>
          </label>
        </div>
      </div>

      <div>
        {stores.length === 0 ? (
          <Text className="muted">No stores yet. Add a store above.</Text>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="store-card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Heading size="4" style={{ margin: 0 }}>{store.name}</Heading>
                  <div className="muted" style={{ fontSize: 13 }}>Store ID: {store.id}</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="shelf-grid">
                  {store.shelves.map((shelf, idx) => (
                    <div key={shelf.id} className="shelf">
                      <div style={{ fontWeight: 600 }}>Shelf {idx + 1}</div>
                      <div className="icons" style={{ marginTop: 8 }}>
                        {shelf.items.length === 0 ? <div className="muted">(empty)</div> : shelf.items.slice(0,3).map(it => {
                          const img = it.supplier ? SUPPLIER_IMAGES[it.supplier] : undefined;
                          return img ? <img key={it.id} src={img} alt={it.name} style={{ width: 28, height: 28 }} /> : <div key={it.id}>📦</div>;
                        })}
                        {shelf.items.length > 3 && <div className="muted">+{shelf.items.length - 3}</div>}
                      </div>

                      <div className="items">
                        {shelf.items.map(it => (
                          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                            <div style={{ fontSize: 14 }}>{it.name} x{it.quantity}</div>
                            <div style={{ fontWeight: 600 }}>${typeof it.price === 'number' && it.price.toFixed ? it.price.toFixed(2) : it.price}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
