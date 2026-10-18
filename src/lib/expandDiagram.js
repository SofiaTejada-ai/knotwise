import { DUR, scaled } from "@/lib/animTiming";
import { TEXT_KINDS } from "@/lib/textCommands";

// Expanding the diagram on the learner's idea ("why would anyone need it?").
// The professor proposes new parts and the values that travel between them;
// this code validates them, places the parts in free space (dropping old,
// unused parts when the board is full) and appends teaching steps that the
// professor then plays one by one with play_step. It only runs after the
// student agreed or asked for it.

export const EXPAND_TOOL_NAMES = ["expand_diagram"];

export const EXPAND_TYPES = [
  "host", "server", "database", "router", "firewall", "cloud", "user", "robot",
  "gear", "lock", "key", "flag", "bug", "bucket", "packet", "circle", "queue", "linked_node", "note"
];

const ID = /^[a-z0-9_]{1,30}$/;
const MAX_PARTS = 4;
const MAX_STEPS = 5;
const MAX_OBJECTS = 12;
const GAP = 150; // minimum distance between part centers
const GRID_X = [120, 285, 450, 615, 780];
const GRID_Y = [95, 205, 315, 425];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Pure: computes the expanded scene, or { error }. Never mutates `scene`.
export function planExpansion(scene, args, { keepIds = [] } = {}) {
  const objects = [...(scene?.objects ?? [])];
  const sequence = [...(scene?.sequence ?? [])];
  const parts = Array.isArray(args?.new_parts) ? args.new_parts.slice(0, MAX_PARTS) : [];
  const steps = Array.isArray(args?.steps) ? args.steps.slice(0, MAX_STEPS) : [];
  if (!parts.length && !steps.length) return { error: "give at least one new part or one step." };

  const added = [];
  for (const p of parts) {
    const id = String(p?.id ?? "").trim().toLowerCase();
    if (!ID.test(id)) return { error: `part id "${p?.id}" must be lowercase letters, digits or _.` };
    if (objects.some((o) => o.id === id) || added.some((a) => a.id === id)) return { error: `part id "${id}" already exists.` };
    const type = EXPAND_TYPES.includes(p?.type) ? p.type : "host";
    const obj = { id, type, label: String(p?.label ?? id).slice(0, 28) };
    if (type === "queue") obj.items = (Array.isArray(p?.items) ? p.items : []).map((v) => String(v).slice(0, 10)).slice(0, 5);
    added.push(obj);
  }

  // Requested removals first; ids that do not exist are ignored.
  const removed = [];
  const remove = (id) => {
    const i = objects.findIndex((o) => o.id === id);
    if (i >= 0) removed.push(objects.splice(i, 1)[0]);
  };
  (Array.isArray(args?.remove_ids) ? args.remove_ids : []).forEach((id) => {
    if (!keepIds.includes(id)) remove(String(id));
  });

  // Steps may connect new parts and parts already on the board.
  const known = (id) => objects.some((o) => o.id === id) || added.some((a) => a.id === id);
  const cleanSteps = [];
  for (const s of steps) {
    const from = String(s?.from ?? "").trim();
    const to = String(s?.to ?? "").trim();
    if (!known(from) || !known(to)) return { error: `step ${from || "?"} -> ${to || "?"} uses a part that is not on the board.` };
    if (from === to) return { error: `step ${from} -> ${to} must connect two different parts.` };
    cleanSteps.push({
      from,
      to,
      label: String(s?.value ?? "").slice(0, 24),
      description: String(s?.description ?? `${from} sends ${s?.value ?? "a message"} to ${to}`).slice(0, 160)
    });
  }

  // Parts the new steps use can never be dropped to make room.
  const used = new Set(cleanSteps.flatMap((s) => [s.from, s.to]));
  const droppable = () =>
    objects.filter((o) => !used.has(o.id) && !keepIds.includes(o.id) && !TEXT_KINDS.includes(o.type) && o.type !== "note");

  // Place each new part near the parts it talks to, on a free grid spot.
  const place = (obj) => {
    const linked = cleanSteps
      .filter((s) => s.from === obj.id || s.to === obj.id)
      .map((s) => objects.find((o) => o.id === (s.from === obj.id ? s.to : s.from)))
      .filter(Boolean);
    const anchor = linked.length
      ? { x: linked.reduce((a, o) => a + o.x, 0) / linked.length, y: linked.reduce((a, o) => a + o.y, 0) / linked.length }
      : { x: 450, y: 260 };
    let best = null;
    for (const y of GRID_Y)
      for (const x of GRID_X) {
        const c = { x, y };
        if (objects.some((o) => dist(o, c) < GAP)) continue;
        const score = dist(c, anchor);
        if (!best || score < best.score) best = { ...c, score };
      }
    return best ? { x: best.x, y: best.y } : null;
  };

  for (const obj of added) {
    let spot = place(obj);
    // Board full: drop the oldest parts nothing new depends on.
    while ((!spot || objects.length >= MAX_OBJECTS) && droppable().length) {
      remove(droppable()[0].id);
      spot = place(obj);
    }
    if (!spot) return { error: "the board is full. Call again with remove_ids for parts that are no longer needed." };
    Object.assign(obj, spot);
    objects.push(obj);
  }

  const firstStep = sequence.length + 1;
  cleanSteps.forEach((s, i) =>
    sequence.push({ step: firstStep + i, action: "emit_packet", ...s, duration: 1.6, expansion: true })
  );
  return { objects, sequence, added, removed, firstStep, stepCount: cleanSteps.length, steps: cleanSteps };
}

export function createExpandCommands({ api, validIds, keepIds }) {
  const commands = {
    async expand_diagram(args) {
      if (args?.student_consented !== true) {
        return 'Not done: nothing was added. First ask the student whether they would like you to expand the diagram for this idea (for example "Would you like me to add that to the diagram?"), and wait. Call expand_diagram again with student_consented true only if they agree or already asked you to show or expand it.';
      }
      const sc = api.scene();
      if (!sc) return "Not done: there is no diagram on screen yet.";
      const plan = planExpansion(sc, args, { keepIds: keepIds() });
      if (plan.error) return `Not done: ${plan.error} Valid ids: ${validIds()}.`;
      api.tutor().loadScene({ ...sc, objects: plan.objects, sequence: plan.sequence });
      await delay(120); // let React draw the new parts before the camera looks
      await api.guided().overview();
      for (const o of plan.added) {
        await api.canvas()?.highlightNode(o.id);
        await delay(scaled(DUR.hold * 0.6) * 1000);
      }
      const added = plan.added.map((o) => `${o.id} ("${o.label}")`).join(", ");
      const removed = plan.removed.length ? ` To make room, these older parts were removed: ${plan.removed.map((o) => `"${o.label}"`).join(", ")}; mention it in a few words.` : "";
      const stepList = plan.steps.map((s, i) => `${plan.firstStep + i}) ${s.description}`).join(" ");
      return `Done: the diagram was expanded for "${String(args.idea ?? "the student's idea").slice(0, 120)}". New parts on screen: ${added || "none"}.${removed} ${
        plan.stepCount
          ? `New teaching steps (not played yet): ${stepList} Explain the idea while pointing at the new parts, then play ONE step at a time with play_step(${plan.firstStep}), play_step(${plan.firstStep + 1}) and so on, explaining after each.`
          : "Explain the new parts while pointing at them."
      } Valid ids now: ${validIds()}.`;
    }
  };
  return { commands };
}
