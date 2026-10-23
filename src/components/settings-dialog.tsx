"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Link2, Settings } from "lucide-react";
import { usePrefs } from "@/lib/i18n";
import type { Handedness, Locale } from "@/lib/preferences";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type HouseholdSettings = {
  code: string;
  shareUrl: string;
};

export function SettingsGear({
  household,
}: {
  household?: HouseholdSettings;
}) {
  const router = useRouter();
  const { t, locale, setLocale, handedness, setHandedness } = usePrefs();
  const [copied, setCopied] = useState(false);
  const [shareExpanded, setShareExpanded] = useState(false);

  async function copyShare() {
    if (!household) return;
    try {
      await navigator.clipboard.writeText(household.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be denied; link remains visible to copy manually.
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setShareExpanded(false);
          setCopied(false);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-10 text-pine hover:bg-secondary/80"
            aria-label={t.settings}
          />
        }
      >
        <Settings className="size-5" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.settingsTitle}</DialogTitle>
          <DialogDescription>{t.settingsBody}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t.handedness}</legend>
            <p className="text-xs text-muted-foreground">{t.handednessHint}</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["left", t.leftHanded],
                  ["right", t.rightHanded],
                ] as [Handedness, string][]
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={handedness === value ? "default" : "outline"}
                  className="h-11"
                  aria-pressed={handedness === value}
                  onClick={() => setHandedness(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t.language}</legend>
            <p className="text-xs text-muted-foreground">{t.languageHint}</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["da", t.danish],
                  ["en", t.english],
                ] as [Locale, string][]
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={locale === value ? "default" : "outline"}
                  className="h-11"
                  aria-pressed={locale === value}
                  onClick={() => setLocale(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-3">
            <p className="text-sm font-medium text-pine">{t.privacyTitle}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t.privacyBody}
            </p>
          </div>

          {household ? (
            <fieldset className="space-y-3 border-t border-border/50 pt-4">
              <legend className="text-sm font-medium">{t.householdSection}</legend>
              <p className="text-xs text-muted-foreground">
                {t.householdSectionHint}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-secondary px-3 py-1.5 font-mono text-sm tracking-[0.18em] text-secondary-foreground">
                  {household.code}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-expanded={shareExpanded}
                  onClick={() => setShareExpanded((v) => !v)}
                >
                  <Link2 className="size-4" />
                  {t.share}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => router.push("/?skift=1")}
                >
                  {t.switchHousehold}
                </Button>
              </div>
              {shareExpanded ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-white/50 px-3 py-3">
                  <div>
                    <Label className="text-muted-foreground">{t.code}</Label>
                    <p className="mt-1 font-mono text-xl tracking-[0.2em]">
                      {household.code}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t.link}</Label>
                    <p className="mt-1 break-all text-sm">{household.shareUrl}</p>
                  </div>
                  <Button type="button" className="w-full" onClick={copyShare}>
                    {copied ? (
                      <>
                        <Check className="size-4" />
                        {t.copied}
                      </>
                    ) : (
                      t.copyLink
                    )}
                  </Button>
                </div>
              ) : null}
            </fieldset>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
