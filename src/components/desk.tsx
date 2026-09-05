"use client";

import { useEffect, useMemo } from "react";
import { Copy, Download, Pause, Play, Repeat, SplitSquareVertical } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { engine } from "@/lib/audio-engine";
import { useDesk } from "@/lib/store";
import {
  MOVES,
  TEMPLATES,
  diagnose,
  punchListText,
  projectJson,
  templateById,
  type MoveId,
} from "@/lib/bar-nine";

const MOVE_IDS = Object.keys(MOVES) as MoveId[];

export function Desk() {
  const title = useDesk((s) => s.title);
  const templateId = useDesk((s) => s.templateId);
  const moveId = useDesk((s) => s.moveId);
  const bpm = useDesk((s) => s.bpm);
  const mode = useDesk((s) => s.mode);
  const playing = useDesk((s) => s.playing);
  const playBar = useDesk((s) => s.playBar);
  const setTitle = useDesk((s) => s.setTitle);
  const setBpm = useDesk((s) => s.setBpm);
  const loadTemplate = useDesk((s) => s.loadTemplate);
  const setMove = useDesk((s) => s.setMove);
  const setMode = useDesk((s) => s.setMode);
  const hydrateAudio = useDesk((s) => s.hydrateAudio);
  const hydrateStorage = useDesk((s) => s.hydrateStorage);
  const setTransport = useDesk((s) => s.setTransport);

  const template = templateById(templateId);
  const findings = useMemo(() => diagnose(template, moveId), [template, moveId]);
  const punch = MOVES[moveId].punch(template);

  useEffect(() => {
    hydrateStorage();
    return engine.subscribe((snap) => {
      setTransport(snap.playing, snap.bar, snap.sixteenth);
    });
  }, [hydrateStorage, setTransport]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        hydrateAudio();
        void engine.toggle();
      }
      if (e.key === "1") setMode("loop");
      if (e.key === "2") setMode("song");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hydrateAudio, setMode]);

  async function onPlay() {
    hydrateAudio();
    await engine.toggle();
  }

  function copyPunch() {
    void navigator.clipboard.writeText(punchListText(title, template, moveId));
    toast("Punch list copied");
  }

  function downloadJson() {
    const blob = new Blob([projectJson(title, template, moveId)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-barnine.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-dvh bg-bg text-fg pb-28">
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{ className: "bg-surface border-border text-fg" }}
      />

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-accent uppercase">
              Bar-9 change desk
            </p>
            <h1 className="mt-1 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              BarNine
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted text-pretty">
              Suno loops. DAWs stall. BarNine sits on the join: pick the move that happens
              when the eight bars would repeat, hear it, export the punch list.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{bpm} BPM</Badge>
            <Badge>{template.keyName}</Badge>
            <Badge>{mode === "song" ? "16 bars" : "8-bar loop"}</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px] sm:px-6">
        <section className="min-w-0 space-y-5">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-40 flex-1">
                <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-subtle">
                  Title
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-accent/50"
                />
              </label>
              <label className="w-28">
                <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-subtle">
                  BPM
                </span>
                <input
                  type="number"
                  min={60}
                  max={200}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value) || bpm)}
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 font-mono text-sm tabular-nums outline-none focus:ring-2 focus:ring-accent/50"
                />
              </label>
              <label className="min-w-36 flex-1">
                <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-subtle">
                  Groove
                </span>
                <select
                  value={templateId}
                  onChange={(e) => loadTemplate(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 text-sm text-muted text-pretty">{template.blurb}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium">Sixteen-bar ruler</h2>
              <div className="flex rounded-md border border-border bg-bg p-1">
                <button
                  type="button"
                  onClick={() => setMode("loop")}
                  className={cn(
                    "flex h-10 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors duration-(--motion-quick)",
                    mode === "loop" ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <Repeat className="size-3.5" />
                  Loop 8
                </button>
                <button
                  type="button"
                  onClick={() => setMode("song")}
                  className={cn(
                    "flex h-10 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors duration-(--motion-quick)",
                    mode === "song" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <SplitSquareVertical className="size-3.5" />
                  Through 16
                </button>
              </div>
            </div>

            <div className="-mx-1 overflow-x-auto">
              <div className="flex min-w-max gap-1 px-1">
                {Array.from({ length: 16 }, (_, i) => {
                  const n = i + 1;
                  const isNine = n === 9;
                  const inLoopRegion = n <= 8;
                  const live = playing && playBar === i && (mode === "song" || i < 8);
                  const dimAfter = mode === "loop" && n > 8;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-label={`Bar ${n}${isNine ? " — the change" : ""}`}
                      onClick={() => {
                        if (mode === "loop" && n > 8) {
                          setMode("song");
                          return;
                        }
                        engine.seekBar(mode === "loop" ? i % 8 : i);
                      }}
                      className={cn(
                        "relative flex h-20 w-11 flex-col items-center justify-end rounded-md border pb-2 transition-colors duration-(--motion-quick) sm:w-12",
                        isNine
                          ? "border-accent bg-accent text-accent-fg"
                          : inLoopRegion
                            ? "border-border bg-surface-2 text-fg"
                            : "border-border bg-bg text-muted",
                        live && !isNine && "ring-2 ring-accent",
                        live && isNine && "ring-2 ring-fg/80",
                        dimAfter && "opacity-40",
                      )}
                    >
                      <span className="font-display text-lg font-medium tabular-nums leading-none">
                        {n}
                      </span>
                      <span className="mt-1 font-mono text-[10px] uppercase tracking-wider opacity-80">
                        {isNine ? "Nine" : inLoopRegion ? "Loop" : "After"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 font-mono text-xs text-subtle">
              {mode === "loop"
                ? "Looping bars 1–8. Switch to Through 16 to hear the join."
                : `Bar 9 fires ${MOVES[moveId].label.toLowerCase()}. Bars 10–16 keep the new state.`}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Bar-9 moves</h2>
                <p className="mt-1 text-xs text-muted">One change. That is the whole desk.</p>
              </div>
              <Badge variant="accent">{MOVES[moveId].label}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {MOVE_IDS.map((id) => {
                const move = MOVES[id];
                const on = id === moveId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMove(id)}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left transition-colors duration-(--motion-quick)",
                      on
                        ? "border-accent bg-accent/10"
                        : "border-border bg-bg hover:border-accent/40",
                    )}
                  >
                    <span className="block text-sm font-medium">{move.label}</span>
                    <span className="mt-0.5 block text-xs text-muted text-pretty">{move.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Diagnosis</h2>
              <Badge variant={findings.some((f) => f.severity === "risk") ? "risk" : "ok"}>
                {findings.length} notes
              </Badge>
            </div>
            <ul className="space-y-3">
              {findings.map((f) => (
                <li key={f.id} className="rounded-lg border border-border bg-bg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-pretty">{f.title}</p>
                    <Badge variant={f.severity}>{f.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted text-pretty">{f.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Punch list</h2>
              <span className="font-mono text-xs tabular-nums text-subtle">{punch.length}</span>
            </div>
            <ol className="space-y-2">
              {punch.map((line, i) => (
                <li key={line} className="text-sm">
                  <span className="font-mono text-xs text-subtle">{i + 1}.</span>{" "}
                  <span className="text-pretty">{line}</span>
                </li>
              ))}
            </ol>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={copyPunch}>
                <Copy />
                Copy list
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadJson}>
                <Download />
                JSON
              </Button>
            </div>
          </div>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 p-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-1 sm:px-3">
          <Button onClick={() => void onPlay()} size="lg" className="min-w-32">
            {playing ? <Pause /> : <Play />}
            {playing ? "Stop" : mode === "song" ? "Play through" : "Play loop"}
          </Button>
          <Button
            variant={mode === "song" ? "secondary" : "outline"}
            onClick={() => setMode(mode === "song" ? "loop" : "song")}
          >
            {mode === "song" ? "Hear the loop" : "Hear bar 9"}
          </Button>
          <p className="ml-auto hidden font-mono text-xs text-subtle sm:block">
            Space plays · 1 loop · 2 through · bar {playing ? playBar + 1 : "—"}
            {mode === "song" && playBar + 1 === 9 ? " · NINE" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
