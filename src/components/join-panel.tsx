"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createHousehold } from "@/lib/api-client";
import {
  clearLastHousehold,
  getLastHousehold,
  setLastHousehold,
} from "@/lib/last-household";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function subscribeNoop() {
  return () => {};
}

export function JoinPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantSwitch = searchParams.get("skift") === "1";

  const saved = useSyncExternalStore(
    subscribeNoop,
    getLastHousehold,
    () => null,
  );

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  useEffect(() => {
    if (wantSwitch) {
      clearLastHousehold();
      return;
    }
    if (saved) {
      router.replace(`/h/${saved}`);
    }
  }, [router, saved, wantSwitch]);

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
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke oprette husstand. Prøv igen.",
      );
      setBusy(null);
    }
  }

  async function onJoin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      setError("Indtast husstandskoden fra jeres link.");
      return;
    }
    setBusy("join");
    try {
      const res = await fetch(
        `/api/households/${encodeURIComponent(normalized)}`,
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Husstanden findes ikke.");
      }
      await goToHousehold(normalized);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke åbne husstanden. Prøv igen.",
      );
      setBusy(null);
    }
  }

  if (!wantSwitch && saved) {
    return (
      <div className="rise-in-delay relative z-10 mx-auto mt-8 w-full max-w-md text-center text-sm text-muted-foreground">
        Åbner jeres liste…
      </div>
    );
  }

  return (
    <div className="rise-in-delay relative z-10 mx-auto mt-8 w-full max-w-md space-y-5">
      {wantSwitch ? (
        <p className="text-center text-sm text-muted-foreground">
          Vælg en anden husstand — eller opret en ny fælles liste.
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-base font-medium"
        disabled={busy !== null}
        onClick={onCreate}
      >
        {busy === "create" ? "Opretter…" : "Opret fælles liste"}
      </Button>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>eller join med kode</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onJoin} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="code">Husstandskode</Label>
          <Input
            id="code"
            name="code"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Fx 7K2M9P"
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
          {busy === "join" ? "Åbner…" : "Åbn listen"}
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
