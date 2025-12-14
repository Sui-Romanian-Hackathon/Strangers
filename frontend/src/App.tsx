import { useEffect, useState } from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { Heading } from "@radix-ui/themes";
import Admin from "./Admin";
import Suppliers from "./Suppliers";
import EscrowOrders from "./EscrowOrders";
import Analytics from "./Analytics";
import logo from "./assets/logo.png";

export type Item = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unitCost?: number;
  discountAppliedPct?: number;
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
  const [view, setView] = useState<"admin" | "suppliers" | "escrow" | "analytics">("admin");
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500); // splash duration
    return () => clearTimeout(timer);
  }, []);

  function addStore(name: string, shelfCount: number) {
    const shelves: Shelf[] = Array.from({ length: shelfCount }).map((_, i) => ({
      id: `${Date.now()}-${i}`,
      items: [],
    }));

    setStores((s) => [
      ...s,
      { id: crypto.randomUUID(), name, shelves },
    ]);
  }

  function addItemToShelf(storeId: string, shelfId: string, items: Item | Item[]) {
    const itemsArray = Array.isArray(items) ? items : [items];
    
    console.log(shelfId, itemsArray);

    setStores((prev) =>
      prev.map((store) =>
        store.id !== storeId
          ? store
          : {
              ...store,
              shelves: store.shelves.map((shelf) =>
                shelf.id !== shelfId
                  ? shelf
                  : {
                      ...shelf,
                      items: itemsArray.reduce((acc, item) => {
                        const existing = acc.find(
                          (it) => it.name === item.name && it.price === item.price
                        );
                        if (existing) {
                          return acc.map((it) =>
                            it.name === item.name && it.price === item.price
                              ? { ...it, quantity: it.quantity + item.quantity }
                              : it
                          );
                        }
                        return [...acc, item];
                      }, shelf.items),
                    }
              ),
            }
      )
    );
  }

  // 🔹 Splash Screen
  if (loading) {
    return (
      <div className="splash-screen">
        <img src={logo} alt="Logo" className="splash-logo" />
        <p className="splash-text">Loading ...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <img src={logo} alt="Inventory Logo" width={40} height={40} />
          <span className="logo-text">Smart Inventory</span>
        </div>

        <nav className="nav">
          <button
            className={`nav-item ${view === "admin" ? "active" : ""}`}
            onClick={() => setView("admin")}
          >
            Dashboard
          </button>
          <button
            className={`nav-item ${view === "suppliers" ? "active" : ""}`}
            onClick={() => setView("suppliers")}
          >
            Suppliers
          </button>
          <button
            className={`nav-item ${view === "escrow" ? "active" : ""}`}
            onClick={() => setView("escrow")}
          >
            Escrow Orders
          </button>
          <button
            className={`nav-item ${view === "analytics" ? "active" : ""}`}
            onClick={() => setView("analytics")}
          >
            Analytics & Strategy
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main">
        <header className="topbar">
          <Heading size="4">
            {view === "admin"
              ? "Admin Dashboard"
              : view === "suppliers"
              ? "Suppliers"
              : view === "escrow"
              ? "Escrow Orders"
              : "Analytics & Strategy"}
          </Heading>
          <ConnectButton />
        </header>

        <section className="content">
          <div className="card">
            {view === "admin" ? (
              <Admin stores={stores} setStores={setStores} />
            ) : view === "suppliers" ? (
              <Suppliers
                stores={stores}
                onBuy={(storeId, shelfId, item) =>
                  addItemToShelf(storeId, shelfId, item)
                }
              />
            ) : view === "escrow" ? (
              <EscrowOrders
                onItemsReleased={(storeId, shelfId, items) =>
                  addItemToShelf(storeId, shelfId, items)
                }
              />
            ) : (
              <Analytics />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
