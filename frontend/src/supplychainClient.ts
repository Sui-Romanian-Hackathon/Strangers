import { SUPPLYCHAIN_MODULE } from "./supplychainConfig";
import { Transaction } from "@mysten/sui/transactions";

// Minimal client helpers to call the Move functions in the `supplychain` module.
// These functions expect a signAndExecute function from useSignAndExecuteTransaction hook.

export async function createShopOnChain(signAndExecute: any, name: string) {
  if (!signAndExecute) throw new Error("No signer provided");
  if (!SUPPLYCHAIN_MODULE) {
    throw new Error("Set SUPPLYCHAIN_MODULE in frontend/src/supplychainConfig.ts to the deployed module address");
  }

  const tx = new Transaction();
  tx.moveCall({
    target: `${SUPPLYCHAIN_MODULE}::supplychain::create_shop`,
    arguments: [tx.pure.string(name)],
  });

  return signAndExecute({ transaction: tx });
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
