import type { AisleDef, Household, Item } from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error ??
        "Noget gik galt. Prøv igen om et øjeblik.",
    );
  }
  return data;
}

export async function createHousehold(): Promise<Household> {
  const res = await fetch("/api/households", { method: "POST" });
  return parseJson<Household>(res);
}

export async function fetchHousehold(code: string): Promise<Household> {
  const res = await fetch(`/api/households/${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  return parseJson<Household>(res);
}

export async function fetchAisles(): Promise<AisleDef[]> {
  const res = await fetch("/api/aisles", { cache: "no-store" });
  const data = await parseJson<{ aisles: AisleDef[] }>(res);
  return data.aisles;
}

export async function createAisleApi(
  name: string,
  color?: string,
): Promise<AisleDef[]> {
  const res = await fetch("/api/aisles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  const data = await parseJson<{ aisles: AisleDef[] }>(res);
  return data.aisles;
}

export async function updateAisleApi(
  id: string,
  details: { name?: string; color?: string },
): Promise<AisleDef[]> {
  const res = await fetch(`/api/aisles/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  const data = await parseJson<{ aisles: AisleDef[] }>(res);
  return data.aisles;
}

export async function reorderAislesApi(
  orderedIds: string[],
): Promise<AisleDef[]> {
  const res = await fetch("/api/aisles/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  const data = await parseJson<{ aisles: AisleDef[] }>(res);
  return data.aisles;
}

export async function addItem(
  code: string,
  name: string,
  aisle: string,
): Promise<Item> {
  const res = await fetch(
    `/api/households/${encodeURIComponent(code)}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, aisle }),
    },
  );
  return parseJson<Item>(res);
}

export async function setItemChecked(
  code: string,
  itemId: string,
  checked: boolean,
): Promise<Item> {
  const res = await fetch(
    `/api/households/${encodeURIComponent(code)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked }),
    },
  );
  return parseJson<Item>(res);
}

export async function deleteItem(code: string, itemId: string): Promise<void> {
  const res = await fetch(
    `/api/households/${encodeURIComponent(code)}/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
  );
  await parseJson<{ ok: boolean }>(res);
}

export async function reorderAisle(
  code: string,
  aisle: string,
  orderedIds: string[],
): Promise<Household> {
  const res = await fetch(
    `/api/households/${encodeURIComponent(code)}/reorder`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aisle, orderedIds }),
    },
  );
  return parseJson<Household>(res);
}

export async function updateItem(
  code: string,
  itemId: string,
  details: { name?: string; aisle?: string },
): Promise<Item> {
  const res = await fetch(
    `/api/households/${encodeURIComponent(code)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    },
  );
  return parseJson<Item>(res);
}
