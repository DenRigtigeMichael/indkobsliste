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

        <section
          aria-labelledby="install-guide-heading"
          className="rise-in-delay mt-10 rounded-xl border border-border/50 bg-secondary/30 px-4 py-3 text-left"
        >
          <h2
            id="install-guide-heading"
            className="text-sm font-medium text-pine"
          >
            {t.installTitle}
          </h2>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li>{t.installIphone}</li>
            <li>{t.installAndroid}</li>
          </ul>
        </section>

        <p className="rise-in-delay mt-8 text-[11px] leading-relaxed text-muted-foreground/80">
          <span className="font-medium text-muted-foreground">{t.disclaimerTitle}.</span>{" "}
          {t.disclaimerBody}
        </p>
      </div>
    </main>
  );
}

export default function HomePage() {
  return <HomeContent />;
}
