import { useState } from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { Heading } from "@radix-ui/themes";
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

    setStores((s) => [
      ...s,
      { id: crypto.randomUUID(), name, shelves },
    ]);
  }

  function addItemToShelf(storeId: string, shelfId: string, item: Item) {
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
                      items: shelf.items.some(
                        (it) =>
                          it.name === item.name && it.price === item.price
                      )
                        ? shelf.items.map((it) =>
                            it.name === item.name &&
                            it.price === item.price
                              ? {
                                  ...it,
                                  quantity: it.quantity + item.quantity,
                                }
                              : it
                          )
                        : [...shelf.items, item],
                    }
              ),
            }
      )
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">📦 Inventory dApp</div>

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
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main">
        <header className="topbar">
          <Heading size="4">
            {view === "admin" ? "Admin Dashboard" : "Suppliers"}
          </Heading>
          <ConnectButton />
        </header>

        <section className="content">
          <div className="card">
            {view === "admin" ? (
              <Admin stores={stores} setStores={setStores} />
            ) : (
              <Suppliers
                stores={stores}
                onBuy={(storeId, shelfId, item) =>
                  addItemToShelf(storeId, shelfId, item)
                }
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
