export type CadenceStatus = "ok" | "due" | "overdue" | "unknown";

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
  aisles: string[];
};
