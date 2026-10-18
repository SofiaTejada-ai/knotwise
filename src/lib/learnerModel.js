// Session learner model: temporary memory of HOW this student is learning,
// kept only for the current Live Tutor session (nothing is saved). The app
// derives it from events it already sees (what the student says, confusion
// reports, replays, interruptions, practice), never from the professor's own
// opinion, and turns it into a short profile for the professor plus pacing
// knobs for the animations and the voice. It records behaviour, never labels.

const SLOWER = /\b(slow(er| down| it down)?|too fast|so fast|not so fast|hold on|one at a time)\b/i;
const FASTER = /\b(faster|speed (it )?up|hurry|quicker|move on|go on|boring)\b/i;
const CONFUSED = /\b(confus\w*|lost me|i'?m lost|don'?t (get|understand)|didn'?t (get|understand)|what do you mean|makes no sense)\b/i;
const KNOWS = /\b(i (already )?know (this|that|it)|already know|got it|i understand|skip (this|that|it))\b/i;
const REPLAY_TOOLS = ["replay_step", "replay_example", "replay_range", "revisit_node", "trace_previous_transition", "ds_replay", "animate_operation"];

const PACES = {
  very_slow: { anim: 0.7, speech: 0.8, text: "very slow: the student asked you to slow down several times. Speak very slowly, one idea per sentence, and pause after each." },
  slow: { anim: 0.82, speech: 0.85, text: "slow: the student asked you to slow down. Speak slowly and leave a pause after each idea." },
  normal: { anim: 1, speech: 0.9, text: "" },
  brisk: { anim: 1.15, speech: 1, text: "brisk: the student asked you to go faster or move on. Keep explanations shorter and skip what they show they know." }
};

const fresh = () => ({
  slower: 0,
  faster: 0,
  confusions: [], // what confused them, latest last
  understood: 0,
  replays: 0,
  interruptions: 0,
  expansions: 0,
  known: new Set(), // step numbers the student already knows (skipped)
  examples: [], // example stories already used
  practice: { correct: 0, missed: 0, hints: 0 }
});

export function createLearnerModel() {
  let s = fresh();
  const listeners = new Set();
  const changed = () => listeners.forEach((fn) => fn());
  const push = (list, v, max = 6) => {
    const t = String(v ?? "").trim().slice(0, 80);
    if (!t || list.includes(t)) return;
    list.push(t);
    if (list.length > max) list.shift();
  };

  const pace = () => {
    const net = Math.max(-3, Math.min(3, s.slower - s.faster));
    return net >= 2 ? "very_slow" : net >= 1 ? "slow" : net <= -2 ? "brisk" : "normal";
  };

  const model = {
    reset() {
      s = fresh();
      changed();
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // ---- signals ----
    noteStudent(text) {
      const t = String(text ?? "");
      const slower = SLOWER.test(t);
      const faster = FASTER.test(t) || KNOWS.test(t);
      const confused = CONFUSED.test(t);
      if (slower) s.slower += 1;
      if (faster) s.faster += 1;
      if (confused) push(s.confusions, t);
      if (slower || faster || confused) changed();
    },
    // Every visual command that finished (not refused) passes through here.
    command(name, args, result) {
      if (/^(Not done|Cancelled|There is no|No recorded|Unknown)/.test(String(result))) return;
      if (REPLAY_TOOLS.includes(name) && name !== "continue_range") {
        s.replays += 1;
        if (args?.speed === "slower" || args?.speed === "very_slow") s.slower += 1;
        changed();
      } else if (name === "expand_diagram") {
        s.expansions += 1;
        changed();
      } else if (name === "ds_start") {
        push(s.examples, args?.title || (Array.isArray(args?.items) ? `${args.kind || "example"} [${args.items.join(", ")}]` : ""));
        changed();
      }
    },
    confirm(understood, confusion) {
      if (understood) s.understood += 1;
      else push(s.confusions, confusion || "the last explanation");
      changed();
    },
    interruption() {
      s.interruptions += 1;
      if (s.interruptions % 3 === 0) changed();
    },
    practice(entry) {
      if (entry?.correct) s.practice.correct += 1;
      else s.practice.missed += 1;
      s.practice.hints += Number(entry?.hints) || 0;
      changed();
    },
    markKnown(steps) {
      (steps ?? []).forEach((n) => Number.isFinite(Number(n)) && s.known.add(Math.round(Number(n))));
      changed();
    },
    isKnown: (n) => s.known.has(Math.round(Number(n))),
    knownSteps: () => [...s.known].sort((a, b) => a - b),

    // ---- outputs ----
    knobs() {
      const p = PACES[pace()];
      return { pace: pace(), animPace: p.anim, speechSpeed: p.speech, examplesPerIdea: s.confusions.length >= 2 ? 3 : s.confusions.length ? 2 : 1 };
    },
    // Short block appended to the professor's instructions; empty until the
    // student has shown something worth adapting to.
    profileText() {
      const k = model.knobs();
      const lines = [];
      if (PACES[k.pace].text) lines.push(`- Pace: ${PACES[k.pace].text}`);
      if (s.confusions.length)
        lines.push(`- Found confusing: ${s.confusions.slice(-3).map((c) => `"${c}"`).join("; ")}. Re-explain those differently, with simpler words and at least ${k.examplesPerIdea} examples.`);
      if (s.known.size) lines.push(`- Already knows steps ${model.knownSteps().join(", ")}: do not re-teach them; skip to the next step they do not know.`);
      if (s.examples.length) lines.push(`- Examples already used: ${s.examples.join("; ")}. Invent different ones.`);
      if (s.replays >= 2) lines.push(`- Asked to see things again ${s.replays} times: after a complex step, offer a replay.`);
      if (s.interruptions >= 3) lines.push(`- Interrupts often (${s.interruptions} times): keep each explanation short and check in more often.`);
      if (s.understood >= 2 && !s.confusions.length) lines.push(`- Understands quickly (${s.understood} checks passed): fewer check questions, slightly harder examples.`);
      if (s.practice.correct + s.practice.missed) lines.push(`- Practice: ${s.practice.correct} correct, ${s.practice.missed} missed, ${s.practice.hints} hints.`);
      if (s.expansions) lines.push(`- Liked expanding the diagram on their own ideas (${s.expansions} times): keep offering when they ask why or what if.`);
      return lines.length
        ? `LEARNER PROFILE (observed by the app during THIS session only; adapt to it quietly and never describe the student with labels):\n${lines.join("\n")}`
        : "";
    },
    // Changes only when the profile text or the pace knobs would change.
    signature: () => `${model.profileText()}|${model.knobs().pace}`
  };
  return model;
}
