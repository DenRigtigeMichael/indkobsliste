import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { AdminScreen } from "@/components/admin-screen";
import { ADMIN_COOKIE, isAdminEnabled, isValidAdminSession } from "@/lib/admin-auth";
import type { AdminStats } from "@/lib/admin-stats";
import { getAdminStats } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await connection();
  const enabled = isAdminEnabled();
  let authed = false;
  let stats: AdminStats | null = null;
  if (enabled) {
    const jar = await cookies();
    authed = isValidAdminSession(jar.get(ADMIN_COOKIE)?.value);
    if (authed) {
      stats = getAdminStats();
    }
  }

  return (
    <main className="relative z-10 flex flex-1 flex-col px-5 pb-12 pt-10">
      <AdminScreen enabled={enabled} authed={authed} stats={stats} />
    </main>
  );
}
