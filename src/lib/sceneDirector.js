import { nodeForStep } from "@/hooks/useGuidedLesson";
import { timing, parseSpeed, scaled, DUR } from "@/lib/animTiming";
import { createTextCommands, TEXT_TOOL_NAMES } from "@/lib/textCommands";
import { trace } from "@/lib/lessonTrace";
import { createHistory } from "@/lib/teachingHistory";
import { createRevisit, REVISIT_TOOL_NAMES } from "@/lib/revisitCommands";
import {
  KINDS,
  RULES,
  COMPLEXITY,
  applyOp,
  buildDsScene,
  createStruct,
  displayItems,
  explainResult,
  summarize
} from "@/lib/dsEngine";

// Scene Director: the ONE authoritative scheduler for a live lesson. The
// professor's structured commands are validated, queued and executed here
// through the GSAP engine. Nothing runs model-written code.
//
//  - Commands run one at a time in order, so dependent steps (a value arrives,
//    THEN the box changes) can never overlap.
//  - Every command ends in exactly one outcome: done, cancelled or failed. A
//    command that never finishes is timed out, its animation is recovered and
//    the queue moves on, so nothing waits forever.
//  - Pace adapts to the queue: when commands are waiting, durations shrink
//    (never below half, never skipping a step), so the visuals keep up.
//  - Data-structure operations are executed by deterministic code; the
//    diagram and the professor's context come from the real result.

// Shared-example tools: names the professor uses for the ONE active example.
// Each maps onto the deterministic data-structure command that executes it.
export const EXAMPLE_ALIASES = {
  create_example: "ds_start",
  replace_example: "ds_start",
  set_example_values: "ds_start",
  perform_operation: "ds_operation",
  animate_operation: "ds_replay",
  get_active_example: "ds_state"
};

export const DIRECTOR_TOOL_NAMES = [
  "focus_node",
  "show_overview",
  "highlight_node",
  "follow_connection",
  "animate_transfer",
  "update_node_state",
  "play_step",
  "pause_visuals",
  "resume_visuals",
  "pause_animation",
  "resume_animation",
  "ds_start",
  "ds_operation",
  "ds_replay",
  "ds_state",
  ...Object.keys(EXAMPLE_ALIASES),
  ...REVISIT_TOOL_NAMES,
  ...TEXT_TOOL_NAMES
];

const STATE_KEYS = ["items", "value", "label", "color", "text"];
const TIMEOUT_MS = 15000;
const PAUSE_NAMES = ["pause_visuals", "resume_visuals", "pause_animation", "resume_animation"];
// Commands that move nothing: the node picture may stay visible during them.
// Every other command moves values or the camera along a path, and the
// picture is hidden so it never covers the operation being taught.
const STILL_NAMES = ["focus_node", "show_overview", "highlight_node", "ds_state", "get_teaching_history", "hide_text", ...PAUSE_NAMES];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const hold = (k = 1) => delay(scaled(DUR.hold * k) * 1000);

export function createDirector(api) {
  let chain = Promise.resolve();
  let epoch = 0;
  let paused = false;
  let pending = 0;
  let ds = null; // { sceneId, meta, struct, ops: [] } committed data-structure state
  let opSeq = 0;
  let exampleSeq = 0;
  const history = [];

  const objects = () => api.scene()?.objects ?? [];
  const find = (id) => objects().find((o) => o.id === id);
  const labelOf = (id) => find(id)?.label || id;
  const validIds = () =>
    objects()
      .filter((o) => o.type !== "note")
      .map((o) => `${o.id} ("${o.label}")`)
      .join(", ");
  const seqIndex = (id) => (api.scene()?.sequence ?? []).map(nodeForStep).indexOf(id);
  const setPaused = (p) => {
    paused = p;
    api.canvas()?.setPaused(p);
  };
  const needNode = (id) => (find(id) ? null : `There is no part with id "${id}". Valid ids: ${validIds()}.`);

  // ---- deterministic data-structure state ----
  const getDs = () => {
    const sc = api.scene();
    if (!sc?.ds) return null;
    if (!ds || ds.sceneId !== sc.scene_id) {
      // A topic change that redraws the same kind of structure keeps the
      // active example (values and operation history); only an explicit
      // create_example / ds_start starts a new one.
      ds =
        ds && sc.ds.carry && ds.meta.kind === sc.ds.kind
          ? { ...ds, sceneId: sc.scene_id, meta: { ...sc.ds, initial: ds.meta.initial } }
          : { sceneId: sc.scene_id, meta: sc.ds, struct: createStruct(sc.ds.kind, sc.ds.initial), ops: [], exampleId: `ex_${++exampleSeq}` };
    }
    return ds;
  };
  // ActiveTeachingExample: the single example both the voice and the diagram use.
  const activeExample = () => {
    const d = getDs();
    if (!d) return null;
    return {
      exampleId: d.exampleId,
      topic: d.meta.kind,
      structureType: d.meta.kind,
      initialState: [...d.meta.initial],
      currentState: [...d.struct.items],
      operations: d.ops.map((o) => ({
        operationId: `op_${o.seq}`,
        operationType: o.op,
        operands: o.value !== undefined ? [o.value] : [],
        expectedBefore: o.before,
        computedAfter: o.after,
        returned: o.returned,
        ok: o.ok
      })),
      currentOperationId: d.ops.length ? `op_${d.ops[d.ops.length - 1].seq}` : null,
      sceneId: d.sceneId,
      version: d.ops.length
    };
  };
  const exampleHeader = (d) =>
    `ACTIVE EXAMPLE ${d.exampleId} (${d.meta.kind}, version ${d.ops.length}): ${summarize(d.struct)}`;
  const setItems = (d, items) => api.tutor().updateObject(d.meta.structId, { items: displayItems(d.meta.kind, items) });
  const setStatus = (d, text) => api.tutor().updateObject(d.meta.statusId, { label: String(text).slice(0, 42) });
  // The picture must always show the committed data.
  const reconcile = () => {
    const d = getDs();
    if (d) setItems(d, d.struct.items);
  };
  const dsFacts = (d) =>
    `${summarize(d.struct)} ${RULES[d.meta.kind]} ${COMPLEXITY[d.meta.kind]}`;

  const playOpVisual = async (d, rec, replay) => {
    const { structId, inId, outId } = d.meta;
    const canvas = api.canvas();
    const g = api.guided();
    if (g.state.focusedNodeId !== structId) await g.travelTo(structId, -1, { follow: false });
    const cam = canvas?.focusNode(structId, 1.15);
    if (replay) setItems(d, rec.before);
    setStatus(d, `${rec.op}(${rec.value !== undefined && rec.op === KINDS[d.meta.kind].add ? rec.value : ""})`);
    await cam;
    await hold(); // the student reads the operation before anything moves
    if (!rec.ok) {
      await canvas?.highlightNode(structId);
      setStatus(d, rec.error === "empty" ? `${rec.op}() on empty: nothing removed` : `${rec.op}() refused`);
      return;
    }
    const info = KINDS[d.meta.kind];
    if (rec.op === info.add) {
      await canvas?.transfer(inId, structId, rec.value);
      setItems(d, rec.after);
      trace("state_committed", { id: structId, op: rec.op });
      await canvas?.highlightNode(structId);
      setStatus(d, `${rec.op}(${rec.value}) added`);
      await hold();
    } else if (rec.op === info.remove) {
      setStatus(d, `${rec.op}(): ${d.meta.kind === "queue" ? "front" : "top"} is ${rec.returned}`);
      await canvas?.highlightNode(structId);
      await hold();
      const out = canvas?.transfer(structId, outId, rec.returned);
      await delay(scaled(0.6) * 1000);
      setItems(d, rec.after);
      trace("state_committed", { id: structId, op: rec.op });
      await out;
      setStatus(d, `${rec.op}() returned ${rec.returned}`);
      await hold();
    } else {
      await canvas?.highlightNode(structId);
      setStatus(d, `peek() = ${rec.returned}`);
      await hold();
    }
  };

  const opMessage = (d, rec, replay) => {
    const head = replay ? "REPLAY of an earlier operation (the data was NOT changed again). " : "";
    const detail = rec.ok
      ? `Before: [${rec.before.join(", ")}]. After: [${rec.after.join(", ")}]. ${rec.returned !== undefined ? `Returned: ${rec.returned}. ` : ""}`
      : "";
    return `${head}${exampleHeader(d)} ${explainResult(rec)} ${detail}The diagram now shows exactly this. Current state: ${summarize(d.struct)} ${RULES[d.meta.kind]} Explain slowly, like a teacher at the board: point at the part that changed, say which element was affected and why, using only these real values. Do not rush into the next operation; every second operation or so, first ask the student to predict what the next one will do and wait for their answer. Mention complexity only briefly if it helps: ${COMPLEXITY[d.meta.kind]}`;
  };

  // Teaching history + semantic navigation (revisit, replay, retrace, resume).
  const hist = createHistory();
  const text = createTextCommands({ api, find, needNode, dsStructId: () => getDs()?.meta.structId });
  const rv = createRevisit({
    text,
    api,
    hist,
    getDs,
    playOpVisual,
    reconcile,
    opMessage,
    find,
    labelOf,
    needNode,
    seqIndex
  });

  const commands = {
    async focus_node({ node_id, zoom_level }) {
      const bad = needNode(node_id);
      if (bad) return bad;
      await api.guided().travelTo(node_id, seqIndex(node_id), { follow: false });
      const z = Number(zoom_level);
      if (Number.isFinite(z) && z > 0) await api.canvas()?.focusNode(node_id, Math.max(1, Math.min(2.6, z)));
      return `Done: the camera zoomed into "${labelOf(node_id)}"${Number.isFinite(z) && z > 0 ? ` at ${Math.max(1, Math.min(2.6, z))}x` : ""} and a simple picture of it is appearing above it. Explain this part now.`;
    },
    async show_overview() {
      await api.guided().overview();
      return "The complete diagram is on screen.";
    },
    async highlight_node({ node_id }) {
      const bad = needNode(node_id);
      if (bad) return bad;
      await api.canvas()?.highlightNode(node_id);
      return `"${labelOf(node_id)}" was highlighted.`;
    },
    async follow_connection({ from_id, to_id }) {
      const bad = needNode(from_id) || needNode(to_id);
      if (bad) return bad;
      await api.guided().travelTo(to_id, seqIndex(to_id), { follow: true, from: from_id, showDot: true });
      return `The camera followed the connection from "${labelOf(from_id)}" to "${labelOf(to_id)}" and is now on "${labelOf(to_id)}".`;
    },
    async animate_transfer({ from_id, to_id, value }) {
      const bad = needNode(from_id) || needNode(to_id);
      if (bad) return bad;
      if (value === undefined || value === null || String(value).trim() === "") return "Give a short value to send.";
      const v = String(value).slice(0, 24);
      // Camera and the moving value are compatible, so they run together.
      const cam = api.guided().travelTo(to_id, seqIndex(to_id), { follow: true, from: from_id, showDot: false });
      await Promise.all([cam, api.canvas()?.transfer(from_id, to_id, v)]);
      await api.canvas()?.highlightNode(to_id);
      return `The value "${v}" traveled from "${labelOf(from_id)}" and has entered "${labelOf(to_id)}". The box has not changed yet: now call update_node_state for "${to_id}" to show what changed inside it, and explain why.`;
    },
    async update_node_state({ node_id, props }) {
      const bad = needNode(node_id);
      if (bad) return bad;
      const clean = {};
      Object.keys(props && typeof props === "object" ? props : {}).forEach((k) => {
        if (STATE_KEYS.includes(k)) clean[k] = k === "items" && Array.isArray(props[k]) ? props[k].map(String).slice(0, 8) : props[k];
      });
      if (!Object.keys(clean).length) return `Nothing to change. Use props with items, value or label.`;
      if (getDs() && node_id === ds.meta.structId) {
        return "That box is a real data structure: its contents change only through ds_operation, never by hand. Use ds_operation.";
      }
      api.tutor().updateObject(node_id, clean);
      trace("state_committed", { id: node_id });
      await api.canvas()?.highlightNode(node_id);
      return `"${labelOf(node_id)}" now visibly shows ${JSON.stringify(clean)}. Explain what changed and why.`;
    },
    async play_step({ step_id }) {
      const seq = api.scene()?.sequence ?? [];
      const n = Math.round(Number(step_id));
      if (!(n >= 1 && n <= seq.length)) return `There is no step ${step_id}. Steps run from 1 to ${seq.length}.`;
      const idx = n - 1;
      const step = seq[idx];
      const node = nodeForStep(step, idx);
      const prev = api.guided().state.focusedNodeId;
      const hasPacket = step.action === "emit_packet" && step.from === prev && step.to === node;
      api.setSeg(idx);
      const cam = node ? api.guided().travelTo(node, idx, { follow: true, showDot: !hasPacket }) : Promise.resolve();
      api.tutor().goToStep(idx);
      await delay(200); // let playback begin
      await Promise.all([cam, api.waitIdle(8000)]);
      const last = idx === seq.length - 1;
      const dsNote = getDs() ? " This diagram is a real data structure: demonstrate with ds_operation, not by describing." : "";
      return `Step ${n} of ${seq.length} has finished on screen: ${step.description || step.action}.${dsNote} ${
        last
          ? 'Explain what just happened, then ask exactly: "Does that make sense?" and wait. Do not call any function yet.'
          : `Explain what just happened in one or two accurate sentences. Then show the next part: call play_step(${n + 1}), or first use animate_transfer and update_node_state for anything the steps do not show.`
      }`;
    },
    async pause_visuals() {
      setPaused(true);
      return "Visuals are paused exactly where they are.";
    },
    async resume_visuals() {
      setPaused(false);
      return "Visuals continue from where they stopped.";
    },
    async pause_animation() {
      setPaused(true);
      return "Done: the animation is paused exactly where it is.";
    },
    async resume_animation() {
      setPaused(false);
      return "Done: the animation continues from where it stopped.";
    },

    // ---- deterministic data structures ----
    async ds_start({ kind, items }) {
      kind = kind || getDs()?.meta.kind;
      if (!KINDS[kind]) return `Supported structures: ${Object.keys(KINDS).join(", ")}.`;
      const list = (Array.isArray(items) ? items : [])
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .map((v) => (Number.isFinite(Number(v)) ? Number(v) : String(v)))
        .slice(0, 6);
      const sc = buildDsScene(kind, list.length ? list : undefined);
      ds = null; // before the scene loads, so nothing carries the old example over
      api.loadScene(sc);
      await delay(150);
      const d = getDs();
      await api.guided().overview();
      await delay(600);
      await api.guided().travelTo(d.meta.structId, -1, { follow: false });
      return `Done: a NEW example replaced the previous one. ${exampleHeader(d)}. The diagram shows exactly these values; use only them from now on. ${dsFacts(d)} Introduce it with one short everyday metaphor, explain the rule, then demonstrate with ds_operation (for example ${KINDS[kind].add} then ${KINDS[kind].remove}). Never state contents other than the ones given by tool results.`;
    },
    async ds_operation({ op, value }) {
      const d = getDs();
      if (!d) return "No data-structure diagram is on screen. Call ds_start first.";
      const result = applyOp(d.struct, String(op ?? "").toLowerCase(), value);
      const rec = { ...result, seq: ++opSeq };
      delete rec.struct;
      // The data is committed by code first, atomically; the picture follows.
      d.struct = result.struct;
      d.ops.push(rec);
      trace("ds_commit", { op: rec.op, ok: rec.ok });
      try {
        await playOpVisual(d, rec, false);
      } finally {
        reconcile();
      }
      return opMessage(d, rec, false);
    },
    async ds_replay({ which }) {
      const d = getDs();
      if (!d || !d.ops.length) return "There is no earlier operation to replay yet.";
      const n = Math.round(Number(which));
      const rec = n >= 1 ? d.ops.find((o) => o.seq === n) || d.ops[d.ops.length - 1] : d.ops[d.ops.length - 1];
      // Visual replay only: the committed data is untouched.
      try {
        await playOpVisual(d, rec, true);
      } finally {
        reconcile();
      }
      return opMessage(d, rec, true);
    },
    async ds_state() {
      const d = getDs();
      if (!d) return "No data-structure diagram is on screen.";
      const log = d.ops
        .slice(-6)
        .map((o) => `#${o.seq} ${o.op}${o.value !== undefined ? `(${o.value})` : "()"} ${o.ok ? `[${o.before.join(", ")}] -> [${o.after.join(", ")}]${o.returned !== undefined ? ` returned ${o.returned}` : ""}` : `refused: ${o.error}`}`)
        .join("; ");
      return `${exampleHeader(d)}. ${dsFacts(d)} Operations so far: ${log || "none"}. Answer the student using ONLY these real values.`;
    }
  };

  Object.assign(commands, rv.commands, text.commands);

  const run = (name, args = {}) => {
    name = EXAMPLE_ALIASES[name] || name;
    const fn = commands[name];
    if (!fn) return Promise.resolve(`Unknown visual command ${name}.`);
    if (PAUSE_NAMES.includes(name)) return fn(args);
    // Issuing a new visual command means the lesson continues.
    if (paused) setPaused(false);
    const my = epoch;
    pending += 1;
    trace("cmd_queued", { name, pending });
    const job = chain.then(async () => {
      let moving = false;
      try {
        if (my !== epoch) {
          trace("cmd_cancelled", { name });
          return "Cancelled because the student interrupted. Answer them, then continue from the current state.";
        }
        // Adaptive pace: shorter transitions while commands are waiting.
        timing.scale = pending > 2 ? 0.75 : pending > 1 ? 0.85 : 1;
        // Temporary replay speed for this one command ("show it again, slower").
        timing.playback = args.speed !== undefined ? parseSpeed(args.speed) : 1;
        if (timing.playback < 1) timing.scale = 1;
        const limit = (TIMEOUT_MS + (Array.isArray(args.steps) ? args.steps.length * 2500 : 0)) / timing.playback;
        history.push({ name, args, at: Date.now(), scene: api.scene()?.scene_id });
        trace("cmd_started", { name });
        moving = !STILL_NAMES.includes(name);
        if (moving) api.setMotion?.(true);
        const t0 = performance.now();
        const before = rv.snapshot();
        let timer;
        const out = await Promise.race([
          fn(args).then((r) => ({ r })),
          new Promise((res) => {
            timer = setTimeout(() => res({ timeout: true }), limit);
          })
        ]).finally(() => clearTimeout(timer));
        if (out.timeout) {
          // Recover the stalled animation without touching the voice session.
          trace("cmd_timeout", { name });
          api.canvas()?.recover();
          rv.state.restore?.();
          reconcile();
          return "The visual took too long and was finished safely. The diagram shows the current real state. Keep explaining.";
        }
        trace("cmd_completed", { name, ms: Math.round(performance.now() - t0) });
        if (!REVISIT_TOOL_NAMES.includes(name)) rv.track(name, args, before, out.r);
        return out.r;
      } catch (err) {
        trace("cmd_failed", { name });
        rv.state.restore?.();
        reconcile();
        return `Not done: that visual failed (${String(err?.message || err).slice(0, 80)}). Tell the student it did not work and explain in words.`;
      } finally {
        if (moving) api.setMotion?.(false);
        timing.playback = 1;
        pending -= 1;
        if (pending <= 0) {
          pending = 0;
          timing.scale = 1;
        }
      }
    });
    chain = job.catch(() => {});
    return job;
  };

  // Student interruption: drop queued commands and keep the last committed
  // state. The command already playing runs to its end (a value transfer is
  // under two seconds), because freezing GSAP here would leave its promise
  // hanging until the timeout and block every later command.
  const interrupt = () => {
    epoch += 1;
    trace("interrupt", { pending });
  };

  // After a scene is (re)loaded, make the picture show the committed example.
  const syncScene = () => reconcile();

  const dsIntro = () => {
    const d = getDs();
    return d
      ? `${exampleHeader(d)}. Use exactly these values when you speak. ${dsFacts(d)} This is a REAL data structure. The professor chooses operations with ds_operation (${KINDS[d.meta.kind].ops.join(", ")}); the app executes them and shows the true result. Lesson plan, one operation at a time with an explanation after each: ${d.meta.plan.map((p) => `${p.op}(${p.value ?? ""})`).join(", then ")}. After that, if the student is following, give a second example with new values (create_example) and connect it to an everyday ${d.meta.kind === "queue" ? "line of people waiting" : "stack of plates or an undo button"}.`
      : "";
  };

  return {
    run,
    interrupt,
    syncScene,
    history,
    teaching: hist,
    revisit: rv.state,
    noteStudent: hist.noteStudent,
    noteProfessor: hist.noteProfessor,
    isPaused: () => paused,
    pending: () => pending,
    dsIntro,
    activeExample,
    dsOpsDone: () => (getDs() ? getDs().ops.length : 0),
    dsState: () => (getDs() ? { items: [...getDs().struct.items], ops: getDs().ops.length } : null)
  };
}