import { SUPPLYCHAIN_MODULE } from "./supplychainConfig";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Store } from "./App";
import { Order } from "./types";


export const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

export async function loadStoresFromChain(owner: string): Promise<Store[]> {
  const objects = await suiClient.getOwnedObjects({
    owner,
    options: { showContent: true },
  });

  const shops = objects.data
    .map(o => o.data?.content)
    .filter((c: any) =>
      c?.dataType === "moveObject" &&
      typeof c.type === "string" &&
      c.type.endsWith("::supplychain::Shop")
    )
    .map((c: any) => ({
      id: c.fields.id.id,
      name: c.fields.name,
      shelves: (c.fields.shelves ?? []).map((s: any) => ({
        id: s.fields.id.id,
        items: (s.fields.items ?? []).map((it: any) => ({
          id: it.fields.id.id,
          name: new TextDecoder().decode(
            Uint8Array.from(it.fields.name)
          ),
          quantity: Number(it.fields.quantity),
          price: Number(it.fields.price),
          supplier: Number(it.fields.supplier_id),
        })),
      })),
    }));

  console.log("Loaded stores from chain:", shops);
  return shops;
}



export async function createShopOnChain(
  signAndExecuteTransaction: any,
  name: string,
  shelvesnr: number
): Promise<{ digest: string }> {
  if (!signAndExecuteTransaction) {
    throw new Error("No signer provided");
  }

  const tx = new Transaction();
  tx.moveCall({
    target: `${SUPPLYCHAIN_MODULE}::supplychain::create_shop`,
    arguments: [
      tx.pure.string(name),
      tx.pure.u64(shelvesnr),
    ],
  });

  return new Promise((resolve, reject) => {
    signAndExecuteTransaction(
      {
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
          showObjectChanges: true,
        },
      },
      {
        onSuccess: async (result: any) => {
          console.log("FULL TX RESULT ↓↓↓");
          console.dir(result, { depth: null });

          const effects = result?.effects;
          const status = effects?.status;

          if (!effects) {
            throw new Error("Transaction executed but no effects returned");
          }

          if (status && status.status !== "success") {
            throw new Error(
              status.error ??
              "Transaction aborted (no detailed error available)"
            );
          }

          if (!result?.digest) {
            throw new Error("Transaction succeeded but digest is missing");
          }

          await suiClient.waitForTransaction({
            digest: result.digest,
          });

          resolve(result);
        },
        onError: reject,
      }
    );
  });
}



export async function buyItemOnChain(signAndExecute: any, shopObjId: string, itemName: string, qty: number) {
  if (!signAndExecute) throw new Error("No signer provided");
  if (!SUPPLYCHAIN_MODULE) {
    throw new Error("Set SUPPLYCHAIN_MODULE in frontend/src/supplychainConfig.ts to the deployed module address");
  }
 
  const tx = new Transaction();
  tx.moveCall({
    target: `${SUPPLYCHAIN_MODULE}::supplychain::buy_item`,
    arguments: [tx.object(shopObjId), tx.pure.string(itemName), tx.pure.u64(qty)],
  });

  return signAndExecute({ transaction: tx });
}

export async function addItemToChain(
  signAndExecute: any,
  shopObjId: string,
  shelfIndex: number,
  itemName: string,
  supplierId: number,
  price: number,
  quantity: number,
  threshold: number = 5,
  restockAmount: number = 10
) {
  if (!signAndExecute) throw new Error("No signer provided");
  if (!SUPPLYCHAIN_MODULE) {
    throw new Error("Set SUPPLYCHAIN_MODULE in frontend/src/supplychainConfig.ts to the deployed module address");
  }

  const tx = new Transaction();
  tx.moveCall({
    target: `${SUPPLYCHAIN_MODULE}::supplychain::add_item`,
    arguments: [
      tx.object(shopObjId),
      tx.pure.u64(shelfIndex),
      tx.pure.string(itemName),
      tx.pure.u64(supplierId),
      tx.pure.u64(price),
      tx.pure.u64(quantity),
      tx.pure.u64(threshold),
      tx.pure.u64(restockAmount),
    ],
  });

  return new Promise((resolve, reject) => {
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result: any) => {
          console.log("Add item transaction succeeded:", result);
          resolve(result);
        },
        onError: (err: any) => {
          console.error("Add item transaction error:", JSON.stringify(err, null, 2));
          console.error("Full error object:", err);
          reject(err);
        },
      }
    );
  });
}

//
// ESCROW & DEFI FUNCTIONS
//

export async function createEscrowOrder(
  signAndExecute: any,
  storeAddress: string,
  supplierId: number,
  itemName: string,
  quantity: number,
  totalPrice: number, // in MIST
  selectedCoinId: string,
  allCoins: Array<{ coinObjectId: string; balance: string }>,
  clockId: string
): Promise<{ digest: string; orderId?: string }> {
  if (!signAndExecute) throw new Error("No signer provided");
  if (!SUPPLYCHAIN_MODULE) {
    throw new Error("Set SUPPLYCHAIN_MODULE in supplychainConfig.ts");
  }

  const GAS_BUFFER_MIST = 200_000_000n; // 0.2 SUI

  const tx = new Transaction();

  // 1️⃣ Find a coin that can pay escrow + gas
    const mainCoin = allCoins.find(
    (c) => c.coinObjectId === selectedCoinId
  );

  if (!mainCoin) {
    throw new Error("Selected coin not found");
  }

  if (BigInt(mainCoin.balance) < BigInt(totalPrice) + GAS_BUFFER_MIST) {
    throw new Error("Selected coin does not have enough balance for escrow + gas");
  }
  // 2️⃣ Split main coin → escrow + gas
  const [escrowCoin] = tx.splitCoins(
  tx.gas,
  [tx.pure.u64(totalPrice)]
);

  const order = tx.moveCall({
    target: `${SUPPLYCHAIN_MODULE}::supplychain::create_order`,
    arguments: [
      tx.pure.address(storeAddress),
      tx.pure.u64(supplierId),
      tx.pure.vector(
        "u8",
        Array.from(new TextEncoder().encode(itemName))
      ),
      tx.pure.u64(quantity),
      tx.pure.u64(totalPrice),
      escrowCoin,
      tx.object(clockId),
    ],
  });

  // 5️⃣ Transfer Order object to store
  tx.transferObjects([order], tx.pure.address(storeAddress));

  return new Promise((resolve, reject) => {
    signAndExecute(
      {
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      },
      {
        onSuccess: async (result: any) => {
  console.log("FULL TX RESULT ↓↓↓");
  console.dir(result, { depth: null });

  const digest = result.digest;

  await suiClient.waitForTransaction({
  digest,
  timeout: 20_000, // 20s safety
});

// 🔍 now it's guaranteed to exist
const txDetails = await suiClient.getTransactionBlock({
  digest,
  options: {
    showEvents: true,
    showObjectChanges: true,
  },
});

  console.log("RPC TX DETAILS ↓↓↓");
  console.dir(txDetails, { depth: null });

  // 🔹 Extract OrderCreatedEvent
  const event = txDetails.events?.find(
    (e: any) =>
      typeof e.type === "string" &&
      e.type.endsWith("::supplychain::OrderCreatedEvent")
  );

  const orderId = event?.parsedJson?.order_id;

  console.log("OrderCreatedEvent (RPC):", event);
  console.log("Extracted orderId:", orderId);

  resolve({
    digest,
    orderId,
  });
},

        onError: reject,
      }
    );
  });
}


export async function releaseEscrow(
  signAndExecute: any,
  orderId: string,
  clockId: string
) {
  const tx = new Transaction();

  tx.moveCall({
    target: `${SUPPLYCHAIN_MODULE}::supplychain::release_escrow`,
    arguments: [
      tx.object(orderId),
      tx.object(clockId),
    ],
  });

  return signAndExecute({ transaction: tx });
}

export async function loadOrdersFromChain(owner: string): Promise<Order[]> {
  const objects = await suiClient.getOwnedObjects({
    owner,
    options: { showContent: true },
  });

  const orders = objects.data
    .map(o => o.data?.content)
    .filter((c: any) =>
      c?.dataType === "moveObject" &&
      typeof c.type === "string" &&
      c.type.endsWith("::supplychain::Order")
    )
    .map((c: any) => {
      const createdAt = Number(c.fields.created_at);
      const releaseDelay = Number(c.fields.release_delay);
      const now = Date.now();
      const timeUntilRelease = Math.max(0, releaseDelay - (now - createdAt));

      return {
        id: c.fields.id.id,
        store_address: c.fields.store_address,
        supplier_id: Number(c.fields.supplier_id),
        item_name: new TextDecoder().decode(
          Uint8Array.from(c.fields.item_name)
        ),
        quantity: Number(c.fields.quantity),
        total_price: Number(c.fields.total_price),
        created_at: createdAt,
        release_delay: releaseDelay,
        time_until_release: timeUntilRelease,
      };
    });

  return orders;
}
