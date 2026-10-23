"use client";

import { Settings } from "lucide-react";
import { usePrefs } from "@/lib/i18n";
import type { Handedness, Locale } from "@/lib/preferences";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function SettingsGear() {
  const { t, locale, setLocale, handedness, setHandedness } = usePrefs();

  return (
    <Dialog>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
