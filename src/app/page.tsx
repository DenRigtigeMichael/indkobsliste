"use client";

import { Suspense } from "react";
import { JoinPanel } from "@/components/join-panel";
import { useT } from "@/lib/i18n";

function HomeContent() {
  const t = useT();
  return (
    <main className="relative z-10 flex flex-1 flex-col px-5 pb-12 pt-[18vh] sm:pt-[20vh]">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="brand-in font-heading text-5xl font-extrabold tracking-tight text-pine sm:text-6xl">
          {t.brand}
        </h1>
        <p className="rise-in mx-auto mt-4 max-w-sm text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t.homeTagline}
        </p>
        <Suspense
          fallback={
            <p className="mt-8 text-sm text-muted-foreground">{t.loadingHome}</p>
          }
        >
          <JoinPanel />
        </Suspense>
        <p className="rise-in-delay mt-10 text-xs text-muted-foreground/90">
          {t.homeTip}
        </p>
      </div>
    </main>
  );
}

export default function HomePage() {
  return <HomeContent />;
}
