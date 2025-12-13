import { useEffect, useState } from "react";
import { Box, Button, Heading, Text, Card } from "@radix-ui/themes";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import type { Order, Item } from "./types";
import { loadOrdersFromChain, releaseEscrow } from "./supplychainClient";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";

const SUPPLIER_NAMES: { [key: number]: string } = {
  1: "Apple",
  2: "Samsung",
  3: "Nike",
};

export default function EscrowOrders({
  onItemsReleased,
}: {
  onItemsReleased?: (storeId: string, shelfId: string, items: Item[]) => void;
}) {
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [releasing, setReleasing] = useState<string | null>(null);

  // Load orders on mount and every 5 seconds
  useEffect(() => {
    const loadOrders = async () => {
      if (!account?.address) return;
      setLoading(true);
      try {
        const loadedOrders = await loadOrdersFromChain(account.address);
        setOrders(loadedOrders);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [account?.address]);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          time_until_release: Math.max(
            0,
            order.release_delay - (Date.now() - order.created_at)
          ),
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleReleaseEscrow = async (order: Order) => {
    setReleasing(order.id);
    try {
      await releaseEscrow(signAndExecuteTransaction, order.id, SUI_CLOCK_OBJECT_ID);
      
      // Get order metadata from localStorage
      const metadata = JSON.parse(localStorage.getItem('escrowOrderMetadata') || '{}');
      const orderMeta = metadata[order.id];

      console.log("Order metadata:", orderMeta);
      
      // If metadata exists and callback provided, add items to shelf
      if (orderMeta && onItemsReleased && orderMeta.storeId && orderMeta.shelfId) {
        console.log("Releasing items to shelf:", orderMeta);
        const item: Item = {
          id: crypto.randomUUID(),
          name: orderMeta.itemName,
          quantity: orderMeta.quantity,
          price: orderMeta.price,
          supplier: order.supplier_id.toString(),
        };
        onItemsReleased(orderMeta.storeId, orderMeta.shelfId, [item]);
        
        // Clean up metadata
        delete metadata[order.id];
        localStorage.setItem('escrowOrderMetadata', JSON.stringify(metadata));
      }
      
      // Remove from list after successful release
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      alert("Escrow released! Items added to your shelf.");
    } catch (err) {
      console.error("Failed to release escrow:", err);
      alert("Failed to release escrow. See console for details.");
    } finally {
      setReleasing(null);
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds <= 0) return "Ready!";
    return `${seconds}s`;
  };

  const formatSUI = (amount: number): string => {
    return (amount / 1_000_000_000).toFixed(2);
  };

  if (loading && orders.length === 0) {
    return (
      <Box>
        <Heading size="3" mb="2">
          Pending Escrow Orders
        </Heading>
        <Text>Loading orders...</Text>
      </Box>
    );
  }

  if (orders.length === 0) {
    return (
      <Box>
        <Heading size="3" mb="2">
          Pending Escrow Orders
        </Heading>
        <Text color="gray">No active escrow orders.</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="3" mb="4">
        Pending Escrow Orders ({orders.length})
      </Heading>

      <div style={{ display: "grid", gap: 12 }}>
        {orders.map((order) => {
          const isReady = order.time_until_release <= 0;
          const supplierName =
            SUPPLIER_NAMES[order.supplier_id] || `Supplier #${order.supplier_id}`;

          return (
            <Card key={order.id} style={{ padding: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div>
                  <Text weight="bold" size="3">
                    {order.item_name} × {order.quantity}
                  </Text>
                  <Text color="gray" size="2">
                    From {supplierName}
                  </Text>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Text weight="bold" size="3">
                    {formatSUI(order.total_price)} SUI
                  </Text>
                  <Text color="gray" size="2">
                    Order ID: {order.id.slice(0, 8)}...
                  </Text>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <Text size="2">
                    Auto-release in:{" "}
                    <span
                      style={{
                        fontWeight: "bold",
                        color: isReady ? "#16a34a" : "#d97706",
                        fontSize: "18px",
                      }}
                    >
                      {formatTime(order.time_until_release)}
                    </span>
                  </Text>
                  <div
                    style={{
                      width: "200px",
                      height: "6px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "3px",
                      marginTop: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        backgroundColor: isReady ? "#16a34a" : "#3b82f6",
                        width: `${Math.max(0, (1 - order.time_until_release / order.release_delay) * 100)}%`,
                        transition: "width 1s linear",
                      }}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleReleaseEscrow(order)}
                  disabled={!isReady || releasing === order.id}
                  style={{
                    opacity: !isReady ? 0.5 : 1,
                  }}
                >
                  {releasing === order.id ? "Releasing..." : "Release Payment"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </Box>
  );
}
