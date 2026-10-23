"use client";

import { PrefsProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return <PrefsProvider>{children}</PrefsProvider>;
}
