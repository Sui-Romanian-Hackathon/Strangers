import { useState } from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Button } from "@radix-ui/themes";
import { WalletStatus } from "./WalletStatus";
import Admin from "./Admin";
import Suppliers from "./Suppliers";

export type Item = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  supplier?: string;
};

export type Shelf = {
  id: string;
  items: Item[];
};

export type Store = {
  id: string;
  name: string;
  shelves: Shelf[];
};

function App() {
  const [view, setView] = useState<"admin" | "suppliers">("admin");
  const [stores, setStores] = useState<Store[]>([]);

  function addStore(name: string, shelfCount: number) {
    const shelves: Shelf[] = Array.from({ length: shelfCount }).map((_, i) => ({
      id: `${Date.now()}-${i}`,
      items: [],
    }));
    setStores((s) => [...s, { id: `${Date.now()}-${Math.random()}`, name, shelves }]);
  }

  function addItemToShelf(storeId: string, shelfId: string, item: Item) {
    setStores((prev) =>
      prev.map((st) => {
        if (st.id !== storeId) return st;
        return {
          ...st,
          shelves: st.shelves.map((sh) => {
            if (sh.id !== shelfId) return sh;
            // merge by name+price
            const existing = sh.items.find((it) => it.name === item.name && it.price === item.price);
            if (existing) {
              return {
                ...sh,
                items: sh.items.map((it) =>
                  it === existing ? { ...it, quantity: it.quantity + item.quantity } : it,
                ),
              };
            }
            return { ...sh, items: [...sh.items, item] };
          }),
        };
      }),
    );
  }

  return (
    <>
      <div className="app-header">
        <div className="brand">dApp Starter Template</div>
        <div>
          <ConnectButton />
        </div>
      </div>

      <div className="main-wrap">
        <div className="layout">
          <aside className="sidebar">
            <div className="compact-card">
              <WalletStatus />
            </div>

            <div className="compact-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Pages</div>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  <button className={`nav-btn ${view === 'admin' ? 'primary' : ''}`} onClick={() => setView('admin')}>Admin</button>
                  <button className={`nav-btn ${view === 'suppliers' ? 'primary' : ''}`} onClick={() => setView('suppliers')}>Suppliers</button>
                </div>
              </div>
            </div>
          </aside>

          <main className="content">
            <div className="card">
              {view === 'admin' ? (
                <Admin stores={stores} setStores={setStores} />
              ) : (
                <Suppliers stores={stores} onBuy={(storeId, shelfId, item) => addItemToShelf(storeId, shelfId, item)} />
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default App;
