import { JoinPanel } from "@/components/join-panel";

export default function HomePage() {
  return (
    <main className="relative z-10 flex flex-1 flex-col px-5 pb-12 pt-[18vh] sm:pt-[20vh]">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="brand-in font-heading text-5xl font-extrabold tracking-tight text-pine sm:text-6xl">
          Indkøbsliste
        </h1>
        <p className="rise-in mx-auto mt-4 max-w-sm text-base leading-relaxed text-muted-foreground sm:text-lg">
          Én fælles liste til jer to. Afkryds i butikken — den anden ser det med
          det samme.
        </p>
        <JoinPanel />
        <p className="rise-in-delay mt-10 text-xs text-muted-foreground/90">
          Tip: På iPhone kan I tilføje siden til hjemmeskærmen via Del → Tilføj
          til hjemmeskærm.
        </p>
      </div>
    </main>
  );
}
