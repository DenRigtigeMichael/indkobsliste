import {
  decryptHouseholdItems,
  decryptItemName,
  encryptItemName,
  isEncryptedName,
} from "./crypto-client";
import type { Household, Item } from "./types";
import { updateItem } from "./api-client";

/** Decrypt item names for UI; queue rewrite of legacy plaintext names. */
export async function hydrateHousehold(
  household: Household,
  key: CryptoKey,
  opts?: {
    code: string;
    /** Ids already queued/migrated this session — mutated in place. */
    migratingIds: Set<string>;
  },
): Promise<Household> {
  const decrypted = await decryptHouseholdItems(household.items, key);

  if (opts) {
    for (let i = 0; i < household.items.length; i++) {
      const raw = household.items[i]!;
      const plain = decrypted[i]!;
      if (isEncryptedName(raw.name)) continue;
      if (opts.migratingIds.has(raw.id)) continue;
      opts.migratingIds.add(raw.id);
      const plaintext = raw.name;
      void (async () => {
        try {
          const envelope = await encryptItemName(plaintext, key);
          await updateItem(opts.code, raw.id, { name: envelope });
        } catch {
          opts.migratingIds.delete(raw.id);
        }
      })();
      // Use plaintext for display immediately
      void plain;
    }
  }

  return { ...household, items: decrypted };
}

export async function sealItemName(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  return encryptItemName(plaintext.trim(), key);
}

export async function openItemName(
  stored: string,
  key: CryptoKey,
): Promise<string> {
  if (!isEncryptedName(stored)) return stored;
  return decryptItemName(stored, key);
}

export async function openItem(item: Item, key: CryptoKey): Promise<Item> {
  return { ...item, name: await openItemName(item.name, key) };
}
