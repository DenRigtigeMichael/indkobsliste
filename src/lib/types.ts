export type CadenceStatus = "ok" | "due" | "overdue" | "unknown";

export type AisleDef = {
  id: string;
  name: string;
  /** Palette color id (see aisle-colors / CSS vars). */
  color: string;
  sortOrder: number;
};

export type Item = {
  id: string;
  householdId: string;
  name: string;
  aisle: string;
  checked: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  lastPurchasedAt: string | null;
  estimatedIntervalDays: number | null;
  purchaseCount: number;
  cadenceStatus: CadenceStatus;
  daysUntilDue: number | null;
};

export type Household = {
  code: string;
  createdAt: string;
  items: Item[];
  aisles: AisleDef[];
};

export function aisleNames(aisles: AisleDef[]): string[] {
  return aisles.map((a) => a.name);
}
