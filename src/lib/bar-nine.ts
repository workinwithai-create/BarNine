export type TemplateId =
  | "night-house"
  | "pop-radio"
  | "trap-topline"
  | "indie-ballad"
  | "dnb-roller";

export type MoveId =
  | "crash-one"
  | "snare-run"
  | "kick-flip"
  | "hats-cut"
  | "bass-invert"
  | "half-time"
  | "air-slam"
  | "lead-enter";

export type PlayMode = "loop" | "song";

export interface Template {
  id: TemplateId;
  name: string;
  blurb: string;
  bpm: number;
  keyName: string;
  feel: string;
}

export interface Move {
  id: MoveId;
  label: string;
  hint: string;
  punch: (t: Template) => string[];
}

export interface Finding {
  id: string;
  title: string;
  detail: string;
  severity: "risk" | "warn" | "ok";
}

export const TEMPLATES: Template[] = [
  {
    id: "night-house",
    name: "Night House",
    blurb: "Four-on-the-floor that never blinks. Bar 9 has to interrupt the grid.",
    bpm: 122,
    keyName: "A minor",
    feel: "four-on-floor",
  },
  {
    id: "pop-radio",
    name: "Pop Radio",
    blurb: "Verse loop with a snap on 2 and 4. The chorus is a decision at bar 9, not more plugins.",
    bpm: 100,
    keyName: "G major",
    feel: "pop-snap",
  },
  {
    id: "trap-topline",
    name: "Trap Topline",
    blurb: "Hats already running. If bar 9 does not change the 808 or the kick, it is still a loop.",
    bpm: 140,
    keyName: "F minor",
    feel: "trap",
  },
  {
    id: "indie-ballad",
    name: "Indie Ballad",
    blurb: "Sparse on purpose. Bar 9 is where a second instrument is allowed to arrive.",
    bpm: 78,
    keyName: "D minor",
    feel: "ballad",
  },
  {
    id: "dnb-roller",
    name: "D&B Roller",
    blurb: "Breaks already busy. The join is a drop-out, not another layer.",
    bpm: 174,
    keyName: "C minor",
    feel: "breaks",
  },
];

export const MOVES: Record<MoveId, Move> = {
  "crash-one": {
    id: "crash-one",
    label: "Crash the 1",
    hint: "Crash + kick slam on bar 9. The cheapest way to prove a section started.",
    punch: (t) => [
      `BAR 9.1  crash cymbal + kick (${t.feel})`,
      "BAR 9.1  bass root re-strikes with the crash",
      "BARS 9–16  keep the original groove — the crash is the only event",
    ],
  },
  "snare-run": {
    id: "snare-run",
    label: "Snare run",
    hint: "16th snare roll on the last two beats of bar 8, landing on the 1.",
    punch: () => [
      "BAR 8.3–8.4  16th snare roll, kicks out",
      "BAR 9.1  crash + kick + bass root",
      "BARS 9–16  original groove resumes",
    ],
  },
  "kick-flip": {
    id: "kick-flip",
    label: "Kick flip",
    hint: "Bar 9 switches the kick pattern. Same tempo, new grid.",
    punch: (t) => [
      `BAR 9–16  kick pattern flips (${kickFlipCopy(t.id)})`,
      "BAR 9.1  optional crash to mark the flip",
      "Leave hats and bass — the kick is the arrangement change",
    ],
  },
  "hats-cut": {
    id: "hats-cut",
    label: "Hats cut",
    hint: "Busy hats thin out at bar 9. Sparse hats suddenly speak.",
    punch: (t) => [
      t.id === "indie-ballad" || t.id === "pop-radio"
        ? "BAR 9–16  hats enter on 8ths (they were ghosted in the loop)"
        : "BAR 9–16  hats drop to quarters — take the 16ths out",
      "BAR 9.1  open hat on the 1 so the cut is audible",
    ],
  },
  "bass-invert": {
    id: "bass-invert",
    label: "Bass invert",
    hint: "New inversion and a busier rhythm from bar 9. The loop's root gets left behind.",
    punch: (t) => [
      `BAR 9–16  bass moves to the fifth / third of ${t.keyName}`,
      "BAR 9–16  add off-beat bass hits (the loop only spoke on 1 and 3)",
      "Do not add a new synth — invert what is already there",
    ],
  },
  "half-time": {
    id: "half-time",
    label: "Half-time",
    hint: "Bar 9 drops the drums to half-time. The drop feels twice as wide.",
    punch: () => [
      "BAR 9–16  kick on 1 only, snare on 3",
      "BAR 9–16  hats on quarters",
      "BAR 9.1  crash, then stay wide — do not fill the gaps",
    ],
  },
  "air-slam": {
    id: "air-slam",
    label: "Air then slam",
    hint: "Last two beats of bar 8 go silent. Bar 9 hits everything.",
    punch: () => [
      "BAR 8.3–8.4  full mute — no kick, no hat, no bass",
      "BAR 9.1  slam: kick + crash + bass root + open hat",
      "BARS 9–16  original groove, louder first downbeat",
    ],
  },
  "lead-enter": {
    id: "lead-enter",
    label: "Lead enter",
    hint: "A topline arrives at bar 9. The loop was a bed. Now it is a song.",
    punch: (t) => [
      `BAR 9–16  lead enters in ${t.keyName} — short phrases, not a full chorus yet`,
      "BAR 9.1  crash so the vocal/lead has a door",
      "Keep drums as they were. The new information is the melody.",
    ],
  },
};

function kickFlipCopy(id: TemplateId): string {
  switch (id) {
    case "night-house":
      return "four-on-floor becomes 1 and 3";
    case "pop-radio":
      return "add a pickup kick on the and of 2";
    case "trap-topline":
      return "add a double-kick on beat 3";
    case "indie-ballad":
      return "kick on 1 and 3 instead of 1 only";
    case "dnb-roller":
      return "switch to a two-step (kick 1, snare 2 and 4 stay)";
  }
}

export function templateById(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function diagnose(template: Template, moveId: MoveId): Finding[] {
  const findings: Finding[] = [
    {
      id: "loop",
      title: "Nothing happens at the repeat",
      detail:
        "Bars 1–8 dump into bar 1 again. That is why the eight bars start to feel like punishment, not a song.",
      severity: "risk",
    },
  ];

  const weakHalfTime = moveId === "half-time" && template.id === "indie-ballad";
  const weakCrash = moveId === "crash-one" && template.id === "dnb-roller";
  const strongAir = moveId === "air-slam";
  const strongLead = moveId === "lead-enter" && template.id !== "dnb-roller";

  if (weakHalfTime) {
    findings.push({
      id: "weak",
      title: "Half-time on a ballad is already the feel",
      detail:
        "The loop is already wide. Pick Lead enter or Bass invert so bar 9 adds information, not more space.",
      severity: "warn",
    });
  } else if (weakCrash) {
    findings.push({
      id: "weak",
      title: "A crash will vanish in breaks",
      detail:
        "D&B already hits the 1. Air then slam or Hats cut will read. A crash on top of a roller will not.",
      severity: "warn",
    });
  } else if (strongAir) {
    findings.push({
      id: "move",
      title: "Silence is the arrangement",
      detail:
        "Two beats of air, then the 1. You do not need a new sound — you need a hole the drop can fall into.",
      severity: "ok",
    });
  } else if (strongLead) {
    findings.push({
      id: "move",
      title: "Bar 9 is where the song starts talking",
      detail: MOVES[moveId].hint,
      severity: "ok",
    });
  } else {
    findings.push({
      id: "move",
      title: MOVES[moveId].label,
      detail: MOVES[moveId].hint,
      severity: "ok",
    });
  }

  if (template.id === "trap-topline" && moveId !== "kick-flip" && moveId !== "bass-invert") {
    findings.push({
      id: "trap",
      title: "Hats will mask a small change",
      detail:
        "Trap loops hide crashes. Kick flip or Bass invert is the change you will still hear in the 808s.",
      severity: "warn",
    });
  }

  return findings;
}

export function punchListText(title: string, template: Template, moveId: MoveId): string {
  const move = MOVES[moveId];
  const lines = [
    `BARNINE PUNCH LIST`,
    `${title}  ·  ${template.name}  ·  ${template.bpm} BPM  ·  ${template.keyName}`,
    ``,
    `MOVE  ${move.label}`,
    ...move.punch(template).map((l) => `  ${l}`),
    ``,
    `WHY  Bar 9 is the first bar of the next section. If it matches bar 1, you are still looping.`,
    ``,
    `Seat: BarNine = the join. HookGrid = the song map. MuteEight = what to take out. MixForge = the master.`,
  ];
  return lines.join("\n");
}

export function projectJson(title: string, template: Template, moveId: MoveId) {
  return JSON.stringify(
    {
      app: "BarNine",
      title,
      templateId: template.id,
      bpm: template.bpm,
      keyName: template.keyName,
      moveId,
      punch: MOVES[moveId].punch(template),
    },
    null,
    2,
  );
}
