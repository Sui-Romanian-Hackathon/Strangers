import { SUPPLYCHAIN_MODULE } from "./supplychainConfig";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Store } from "./App";


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
