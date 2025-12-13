import { useCurrentAccount, useSuiClientQuery, useSuiClient } from "@mysten/dapp-kit";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { SUPPLYCHAIN_MODULE } from "./supplychainConfig";

interface Store {
  id: string;
  name: string | null;
  shelves: Shelf[];
}

interface Shelf{
  items: Item[];
}

export interface Item {                
  name: string;              
  supplierId: number;       
  price: number;             
  quantity: number;         
  threshold: number;         
  restockAmount: number;     
}

export function OwnedObjects() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [stores, setStores] = useState<Store[]>([]);

  const { data, isPending, error } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address as string,
    },
    {
      enabled: !!account,
    },
  );

  useEffect(() => {
    if (!data) return;

    const fetchStoreInfo = async () => {
      const results: Store[] = [];

      console.log("Owned objects data:", data);

      for (const item of data.data) {
        const id = item.data?.objectId;
        if (!id) continue;

        // Fetch full object details
        const obj = await suiClient.getObject({
          id,
          options: {
            showContent: true,
            showType: true,
          },
        });

        // Try direct content fields
        let fields = (obj.data?.content as any)?.fields ?? null;

        // If no fields, try dynamic-field lookup
        if (!fields) {
          console.log(`No direct fields for ${id}, checking dynamic fields...`);
          try {
            const parentId = obj.data?.objectId;

            if (parentId) {
              const dyn = await suiClient.getDynamicFields({ parentId });
              const entries = (dyn as any)?.data ?? [];

              if (entries.length > 0) {
                const entry = entries[0];
                const dfObj = await suiClient.getDynamicFieldObject({
                  parentId,
                  name: entry.name,
                });

                fields =
                  (dfObj.data?.content as any)?.fields ??
                  (dfObj.data?.content as any)?.value?.fields ??
                  null;
              }
            }
          } catch (err) {
            console.warn("Dynamic field lookup failed:", err);
          }
        }

        // Extract name if present
        const name = fields?.name ?? null;
        const shelves = fields?.shelves ?? null;

        results.push({
          id,
          name,
          shelves,
        });
      }

      setStores(results);
    };

    fetchStoreInfo();
  }, [data, suiClient]);

  if (!account) return null;
  if (error) return <Flex>Error: {error.message}</Flex>;
  if (isPending || !data) return <Flex>Loading...</Flex>;

  return (
    <Flex direction="column" my="2">
      {stores.length === 0 ? (
        <Text>No objects with readable fields</Text>
      ) : (
        <Heading size="4">Objects owned by the connected wallet</Heading>
      )}

      {stores.map((store) => (
        <Flex key={store.id} direction="column" mb="2">
          <Text>Object ID: {store.id}</Text>
          <Text>Name: {store.name ?? "No name field"}</Text>
          <Text>Shelves: {store.shelves ? store.shelves.length : "No shelves field"}</Text>
        </Flex>
      ))}
    </Flex>
  );
}