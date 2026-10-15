"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createHousehold } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "indkobsliste-code";

export function JoinPanel() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  async function goToHousehold(nextCode: string) {
    const normalized = nextCode.trim().toUpperCase();
    localStorage.setItem(STORAGE_KEY, normalized);
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
      const res = await fetch(`/api/households/${encodeURIComponent(normalized)}`);
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

  return (
    <div className="rise-in-delay relative z-10 mx-auto mt-8 w-full max-w-md space-y-5">
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
