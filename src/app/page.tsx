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

        <div className="rise-in-delay mt-8 space-y-3 text-left">
          <div className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-3">
            <p className="text-sm font-medium text-pine">{t.privacyTitle}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t.privacyBody}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-3">
            <p className="text-sm font-medium text-pine">{t.disclaimerTitle}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t.disclaimerBody}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return <HomeContent />;
}
