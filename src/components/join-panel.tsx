"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createHousehold } from "@/lib/api-client";
import {
  clearLastHousehold,
  getLastHousehold,
  setLastHousehold,
} from "@/lib/last-household";
import { isHomeScreenLaunch } from "@/lib/site-url";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsGear } from "@/components/settings-dialog";

function subscribeNoop() {
  return () => {};
}

export function JoinPanel() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantSwitch = searchParams.get("skift") === "1";
  const sourcePwa = searchParams.get("source") === "pwa";

  const saved = useSyncExternalStore(
    subscribeNoop,
    getLastHousehold,
    () => null,
  );

  // Window-only standalone check — server snapshot false avoids hydration mismatch.
  const standaloneShell = useSyncExternalStore(
    subscribeNoop,
    () => isHomeScreenLaunch({ get: () => null }),
    () => false,
  );

  // Only auto-open last list from home-screen / PWA — never hijack Safari
  // deep links that landed on `/` (e.g. apex forward that stripped /h/CODE).
  const fromHomeScreen = sourcePwa || standaloneShell;

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  useEffect(() => {
    if (wantSwitch) {
      clearLastHousehold();
      return;
    }
    if (fromHomeScreen && saved) {
      router.replace(`/h/${saved}`);
    }
  }, [fromHomeScreen, router, saved, wantSwitch]);

  async function goToHousehold(nextCode: string) {
    const normalized = nextCode.trim().toUpperCase();
    setLastHousehold(normalized);
    router.push(`/h/${normalized}`);
  }

  async function onCreate() {
    setError(null);
    setBusy("create");
    try {
      const household = await createHousehold();
      await goToHousehold(household.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.createFailed);
      setBusy(null);
    }
  }

  async function onJoin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      setError(t.joinCodeTooShort);
      return;
    }
    setBusy("join");
    try {
      const res = await fetch(
        `/api/households/${encodeURIComponent(normalized)}`,
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? t.householdMissing);
      }
      await goToHousehold(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.joinFailed);
      setBusy(null);
    }
  }

  if (!wantSwitch && fromHomeScreen && saved) {
    return (
      <div className="rise-in-delay relative z-10 mx-auto mt-8 w-full max-w-md text-center text-sm text-muted-foreground">
        {t.openingList}
      </div>
    );
  }

  return (
    <div className="rise-in-delay relative z-10 mx-auto mt-8 w-full max-w-md space-y-5">
      <div className="flex justify-end">
        <SettingsGear />
      </div>

      {wantSwitch ? (
        <p className="text-center text-sm text-muted-foreground">
          {t.switchHouseholdHint}
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-base font-medium"
        disabled={busy !== null}
        onClick={onCreate}
      >
        {busy === "create" ? t.creating : t.createList}
      </Button>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>{t.orJoinWithCode}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onJoin} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="code">{t.householdCode}</Label>
          <Input
            id="code"
            name="code"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t.codePlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="h-12 tracking-[0.2em]"
            disabled={busy !== null}
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          className="h-12 w-full text-base"
          disabled={busy !== null}
        >
          {busy === "join" ? t.opening : t.openList}
        </Button>
      </form>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-overdue px-3 py-2 text-sm text-overdue-fg"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
