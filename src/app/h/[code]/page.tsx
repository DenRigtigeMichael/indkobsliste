import { GroceryList } from "@/components/grocery-list";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function HouseholdPage({ params }: Props) {
  const { code } = await params;
  return (
    <main className="relative z-10 flex-1">
      <GroceryList code={code.toUpperCase()} />
    </main>
  );
}
