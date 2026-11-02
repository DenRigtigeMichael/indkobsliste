"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SettingsGear } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrefs } from "@/lib/i18n";
import type { AdminStats } from "@/lib/admin-stats";
import type { Locale } from "@/lib/preferences";

function formatUtcDate(isoDate: string, locale: Locale): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatUtcStamp(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <h2 className="text-sm font-medium text-pine">{label}</h2>
      <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </section>
  );
}

export function AdminScreen({
  enabled,
  authed,
  stats,
}: {
  enabled: boolean;
  authed: boolean;
  stats: AdminStats | null;
}) {
  const router = useRouter();
  const { t, locale } = usePrefs();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"login" | "logout" | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("login");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 401) {
        setError(t.adminBadPassword);
        setBusy(null);
        return;
      }
      if (!res.ok) {
        setError(t.adminSignInFailed);
        setBusy(null);
        return;
      }
      setPassword("");
      setBusy(null);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError(t.adminSignInFailed);
      setBusy(null);
    }
  }

  async function onLogout() {
    setBusy("logout");
    setError(null);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError(t.adminSignInFailed);
    } finally {
      setBusy(null);
    }
  }

  function onRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  const weekLabel =
    stats !== null ? formatUtcDate(stats.isoWeekStart, locale) : "";
  const maxWeek = stats
    ? Math.max(1, ...stats.weeks.map((week) => week.activeHouseholds))
    : 1;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6 flex items-center justify-end gap-2">
        {authed ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={onRefresh}
              disabled={busy !== null || isPending}
            >
              {t.adminRefresh}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => void onLogout()}
              disabled={busy !== null || isPending}
            >
              {busy === "logout" ? t.adminSigningOut : t.adminSignOut}
            </Button>
          </>
        ) : null}
        <SettingsGear />
      </div>

      <h1 className="font-heading text-4xl font-extrabold tracking-tight text-pine">
        {t.adminTitle}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t.adminTagline}
      </p>

      {!enabled ? (
        <section className="mt-8 rounded-xl border border-border/60 bg-card px-4 py-4">
          <h2 className="text-sm font-medium text-pine">{t.adminDisabledTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t.adminDisabledBody}
          </p>
        </section>
      ) : null}

      {enabled && !authed ? (
        <form onSubmit={onLogin} className="mt-8 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="admin-password">{t.adminPassword}</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12"
              disabled={busy !== null || isPending}
              required
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base"
            disabled={busy !== null || isPending}
          >
            {busy === "login" || isPending ? t.adminSigningIn : t.adminSignIn}
          </Button>
        </form>
      ) : null}

      {enabled && authed && stats ? (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label={t.adminTotal}
              value={stats.totalHouseholds}
              hint={t.adminTotalHint}
            />
            <StatCard
              label={t.adminActive7}
              value={stats.activeLast7Days}
              hint={t.adminActive7Hint}
            />
            <StatCard
              label={t.adminActiveWeek}
              value={stats.activeIsoWeek}
              hint={t.adminActiveWeekHint(weekLabel)}
            />
            <StatCard
              label={t.adminCreatedWeek}
              value={stats.createdIsoWeek}
              hint={t.adminCreatedWeekHint}
            />
          </div>

          <section className="rounded-xl border border-border/60 bg-card px-4 py-4">
            <h2 className="text-sm font-medium text-pine">{t.adminHistoryTitle}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t.adminHistoryHint}
            </p>
            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">{t.adminHistoryTitle}</caption>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="pb-2 font-medium">
                    {t.adminWeek}
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    <span className="sr-only">{t.adminHouseholds}</span>
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    {t.adminHouseholds}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.weeks.map((week) => {
                  const width = Math.round(
                    (week.activeHouseholds / maxWeek) * 100,
                  );
                  const current = week.weekStart === stats.isoWeekStart;
                  return (
                    <tr
                      key={week.weekStart}
                      className={current ? "text-pine" : undefined}
                    >
                      <th
                        scope="row"
                        className="py-1.5 pr-3 text-left text-xs font-medium whitespace-nowrap"
                      >
                        {formatUtcDate(week.weekStart, locale)}
                        {current ? (
                          <span className="mt-0.5 block text-[0.65rem] font-normal tracking-wide uppercase">
                            {t.adminThisWeek}
                          </span>
                        ) : null}
                      </th>
                      <td className="w-full py-1.5">
                        <div
                          className="h-2 overflow-hidden rounded-full bg-secondary"
                          aria-hidden="true"
                        >
                          <div
                            className="h-2 rounded-full bg-pine"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-1.5 pl-3 text-right text-base font-semibold tabular-nums">
                        {week.activeHouseholds}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              {t.adminThrottleNote}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.adminUpdated}{" "}
              {formatUtcStamp(stats.generatedAt, locale)} UTC
            </p>
          </section>
        </div>
      ) : null}

      {enabled && authed && !stats ? (
        <p className="mt-8 text-sm text-muted-foreground" role="alert">
          {t.adminLoadFailed}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-overdue px-3 py-2 text-sm text-overdue-fg"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-8 text-center text-sm">
        <Link href="/" className="text-pine underline-offset-4 hover:underline">
          {t.toHome}
        </Link>
      </p>
    </div>
  );
}
