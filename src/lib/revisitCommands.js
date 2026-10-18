import { nodeForStep } from "@/hooks/useGuidedLesson";
import { explainResult } from "@/lib/dsEngine";
import { trace } from "@/lib/lessonTrace";
import { TEXT_TOOL_NAMES } from "@/lib/textCommands";

// Semantic navigation for the live professor: revisit a part, replay a step or
// an example, retrace a transition, explain a state change, compare states,
// go back, and resume. Three things are kept strictly apart:
//   - AUTHORITATIVE state: the real queue/stack (never touched here)
//   - RECORDED snapshots: what the history stored at the time
//   - VISUAL replay: a temporary picture that is always restored afterwards
// Nothing here runs a data-structure operation.

const STATE_KEYS = ["items", "value", "label", "color", "text", "highlight"];
const TEXT_EVENTS = TEXT_TOOL_NAMES.filter((n) => n !== "hide_text");
const FORWARD = ["play_step", "ds_operation", "animate_transfer", "update_node_state", "ds_start", ...TEXT_EVENTS];
const RECORDED = [...FORWARD, "focus_node", "follow_connection"];
const FAILED = /^(There is no|Give a short|Nothing to change|That box|No data-structure|Cancelled|Unknown|Supported|Not done)/;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const REVISIT_TOOL_NAMES = [
  "revisit_node",
  "replay_step",
  "replay_example",
  "trace_previous_transition",
  "explain_state_change",
  "compare_states",
  "return_to_previous_focus",
  "resume_original_teaching_path",
  "get_teaching_history"
];

export function createRevisit(ctx) {
  const { api, hist, text, getDs, playOpVisual, reconcile, opMessage, find, labelOf, needNode, seqIndex } = ctx;
  // revisiting: a detour is in progress. returnTo: where the detour began.
  // pos: the original teaching position (furthest point of the real lesson).
  const state = { revisiting: false, returnTo: null, pos: { nodeId: null, stepN: 0 }, restore: null };

  const lessonId = () => api.scene()?.scene_id ?? "";
  const seq = () => api.scene()?.sequence ?? [];
  const focused = () => api.guided().state.focusedNodeId;

  // ---- snapshots ----
  const snapshot = () => {
    const nodes = {};
    (api.scene()?.objects ?? []).forEach((o) => {
      const p = {};
      STATE_KEYS.forEach((k) => {
        if (o[k] !== undefined) p[k] = Array.isArray(o[k]) ? [...o[k]] : o[k];
      });
      nodes[o.id] = p;
    });
    const d = getDs();
    return { nodes, ds: d ? [...d.struct.items] : null, focused: focused() ?? null };
  };
  const applySnapshot = (s) => {
    if (!s) return;
    Object.entries(s.nodes).forEach(([id, p]) => find(id) && api.tutor().updateObject(id, p));
  };
  const shortProps = (p) =>
    Object.entries(p || {})
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(", ")}]` : v}`)
      .join(", ");
  const diffText = (a, b) => {
    const out = [];
    Object.keys(b?.nodes ?? {}).forEach((id) => {
      if (JSON.stringify(a?.nodes?.[id]) !== JSON.stringify(b.nodes[id]) && find(id)?.type !== "note") {
        out.push(`"${labelOf(id)}" went from {${shortProps(a?.nodes?.[id])}} to {${shortProps(b.nodes[id])}}`);
      }
    });
    if (a?.ds && b?.ds && JSON.stringify(a.ds) !== JSON.stringify(b.ds)) out.push(`the real data went from [${a.ds.join(", ")}] to [${b.ds.join(", ")}]`);
    return out.join("; ") || "nothing inside the parts changed";
  };

  // Temporary visuals: whatever happens, the committed picture comes back.
  const withRestore = async (fn) => {
    const current = snapshot();
    state.restore = () => {
      applySnapshot(current);
      reconcile();
    };
    try {
      return await fn();
    } finally {
      state.restore?.();
      state.restore = null;
    }
  };

  // ---- recording ----
  const track = (name, args, before, result) => {
    if (!RECORDED.includes(name) || FAILED.test(String(result))) return;
    const after = snapshot();
    const id = lessonId();
    const n = Math.round(Number(args?.step_id));
    const step = name === "play_step" ? seq()[n - 1] : null;
    const d = getDs();
    const rec = name === "ds_operation" ? d?.ops[d.ops.length - 1] : null;
    const node =
      name === "play_step" ? nodeForStep(step, n - 1) : name === "ds_operation" ? d?.meta.structId : args?.to_id || args?.node_id || args?.id || focused();
    const desc = {
      focus_node: () => `Focused on "${labelOf(node)}"`,
      follow_connection: () => `Followed the connection from "${labelOf(args.from_id)}" to "${labelOf(args.to_id)}"`,
      animate_transfer: () => `"${args.value}" traveled from "${labelOf(args.from_id)}" to "${labelOf(args.to_id)}"`,
      update_node_state: () => `"${labelOf(node)}" now shows {${shortProps(args.props)}}`,
      play_step: () => step?.description || step?.action || `Step ${n}`,
      ds_operation: () => (rec ? explainResult(rec) : "Data-structure operation"),
      ds_start: () => `Started a ${args.kind} diagram`,
      show_text: () => `Showed ${args.kind || "text"} "${args.id}": ${args.content}`,
      update_text: () => `"${args.id}" changed to: ${args.content}`,
      replace_expression: () => `"${args.id}" was replaced by: ${args.content}`,
      highlight_token: () => `Highlighted "${args.token}" in "${args.id}"`,
      move_value: () => `"${args.value}" moved from "${labelOf(args.from_id)}" to "${labelOf(args.to_id)}"`,
      transform_equation: () => `Equation "${args.id}": ${(args._steps ?? []).map((s) => s.expression).join(" -> ")}`
    }[name]();
    const count = hist.forLesson(id).filter((e) => e.eventType === name).length + 1;
    const stepId = name === "play_step" ? `step_${n}` : name === "ds_operation" && rec ? `op_${rec.seq}` : `${name}_${count}`;
    const ev = hist.add({
      lessonId: id,
      nodeId: node ?? "",
      stepId,
      eventType: name,
      description: String(desc).slice(0, 220),
      stateBefore: before,
      stateAfter: after,
      args: args ?? {},
      seq: rec?.seq
    });
    hist.noteCamera(focused(), name);
    if (FORWARD.includes(name)) {
      state.revisiting = false;
      state.returnTo = null;
    }
    // The original teaching position only moves forward in the real lesson.
    if (!state.revisiting && name !== "update_node_state") {
      if (name === "play_step") {
        if (n >= state.pos.stepN) state.pos = { nodeId: node, stepN: n };
      } else if (name === "ds_start") state.pos = { nodeId: d?.meta.structId ?? node, stepN: 0 };
      else if (node) state.pos = { ...state.pos, nodeId: node };
    }
    hist.committed = after;
    trace("history_event", { id: ev.eventId, type: name });
  };

  // ---- replay primitives (visual only) ----
  const enterRevisit = () => {
    if (!state.revisiting) {
      state.revisiting = true;
      state.returnTo = focused() ?? state.pos.nodeId;
    }
  };
  const goTo = (id, opts = {}) => api.guided().travelTo(id, seqIndex(id), { follow: false, ...opts });
  const nextUpdate = (ev) => {
    const list = hist.forLesson(ev.lessonId);
    const nxt = list[list.indexOf(ev) + 1];
    return nxt && nxt.eventType === "update_node_state" && nxt.nodeId === ev.nodeId ? nxt : null;
  };

  const replayStepVisual = async (n, follow) => {
    const idx = n - 1;
    const node = nodeForStep(seq()[idx], idx);
    const cam = node ? api.guided().travelTo(node, idx, { follow, showDot: follow }) : Promise.resolve();
    api.tutor().goToStep(idx);
    await delay(200);
    await Promise.all([cam, api.waitIdle(8000)]);
  };

  const replayEvent = async (ev, { follow = false } = {}) => {
    const c = () => api.canvas();
    if (TEXT_EVENTS.includes(ev.eventType)) {
      await withRestore(() => text.replay(ev, applySnapshot));
      return true;
    }
    if (ev.eventType === "ds_operation") {
      const d = getDs();
      const rec = d?.ops.find((o) => o.seq === ev.seq);
      if (!rec) return false;
      await withRestore(() => playOpVisual(d, rec, true));
      return true;
    }
    if (ev.eventType === "play_step") {
      await withRestore(() => replayStepVisual(Number(ev.stepId.slice(5)), follow));
      return true;
    }
    if (ev.eventType === "animate_transfer") {
      const { from_id, to_id, value } = ev.args;
      await withRestore(async () => {
        applySnapshot(ev.stateBefore);
        const cam = api.guided().travelTo(to_id, seqIndex(to_id), { follow: true, from: from_id, showDot: false });
        await Promise.all([cam, c()?.transfer(from_id, to_id, String(value))]);
        const upd = nextUpdate(ev);
        if (upd) applySnapshot(upd.stateAfter);
        await c()?.highlightNode(to_id);
      });
      return true;
    }
    if (ev.eventType === "update_node_state") {
      await withRestore(async () => {
        applySnapshot(ev.stateBefore);
        await goTo(ev.nodeId);
        await delay(700);
        applySnapshot(ev.stateAfter);
        await c()?.highlightNode(ev.nodeId);
      });
      return true;
    }
    if (ev.nodeId && find(ev.nodeId)) {
      await goTo(ev.nodeId);
      await c()?.highlightNode(ev.nodeId);
      return true;
    }
    return false;
  };

  const current = () => {
    const d = getDs();
    return d ? `The real data is unchanged: ${d.struct.kind} [${d.struct.items.join(", ")}].` : "The real diagram state is unchanged.";
  };
  const stateLine = (ev) =>
    ev.stateBefore?.ds ? `Recorded before: [${ev.stateBefore.ds.join(", ")}]. Recorded after: [${ev.stateAfter.ds.join(", ")}].` : `Recorded change: ${diffText(ev.stateBefore, ev.stateAfter)}.`;
  const afterNote = `Explain what the student just watched. Then choose: stay here, call trace_previous_transition to show how it connects, return_to_previous_focus, or resume_original_teaching_path when they are ready to continue.`;
  const latest = (pred) => {
    const list = hist.forLesson(lessonId());
    for (let i = list.length - 1; i >= 0; i--) if (pred(list[i])) return list[i];
    return null;
  };
  const REPLAYABLE = ["ds_operation", "animate_transfer", "update_node_state", "play_step", ...TEXT_EVENTS];
  const EXAMPLES = ["ds_operation", "animate_transfer", "transform_equation", "move_value", "highlight_token", "replace_expression", "play_step"];

  const commands = {
    async revisit_node({ node_id, replay }) {
      const bad = needNode(node_id);
      if (bad) return bad;
      enterRevisit();
      await goTo(node_id);
      const ev = replay === false ? null : latest((e) => REPLAYABLE.includes(e.eventType) && hist.touches(e, node_id));
      let replayed = false;
      if (ev) {
        replayed = await replayEvent(ev, { follow: false });
        if (focused() !== node_id) await goTo(node_id);
      } else await api.canvas()?.highlightNode(node_id);
      const here = hist.forLesson(lessonId()).filter((e) => hist.touches(e, node_id)).slice(-4).map((e) => e.description).join("; ");
      return `The camera is back on "${labelOf(node_id)}" and its picture is shown. ${replayed ? `Its earlier animation was replayed: ${ev.description}. ` : ""}${here ? `What happened here earlier: ${here}. ` : ""}${current()} Nothing was executed again; the original teaching position (${labelOf(state.pos.nodeId)}) is saved. ${afterNote}`;
    },
    async replay_step({ step_id }) {
      const id = lessonId();
      let ev = hist.resolve(id, step_id);
      const n = Math.round(Number(step_id));
      if (!ev && n >= 1 && n <= seq().length) ev = { eventType: "play_step", stepId: `step_${n}`, description: seq()[n - 1].description || `Step ${n}`, lessonId: id };
      if (!ev) return `No recorded step "${step_id}". Recorded: ${hist.brief(id, labelOf, 8) || "nothing yet"}.`;
      enterRevisit();
      if (!(await replayEvent(ev, { follow: true }))) return "That step could not be replayed.";
      return `Replayed "${ev.description}" visually. ${current()} It was not executed again. ${afterNote}`;
    },
    async replay_example({ example_id }) {
      const id = lessonId();
      const ex = example_id ? hist.resolve(id, example_id) : null;
      const ev = ex || latest((e) => EXAMPLES.includes(e.eventType)) || latest((e) => REPLAYABLE.includes(e.eventType));
      if (!ev) return "There is no earlier example to replay yet. Teach one first.";
      enterRevisit();
      const d = getDs();
      if (ev.eventType === "ds_operation" && d) {
        const rec = d.ops.find((o) => o.seq === ev.seq);
        if (!rec || !(await replayEvent(ev))) return "That example could not be replayed.";
        return `${opMessage(d, rec, true)} The student watched the recorded state [${rec.before.join(", ")}] change to [${rec.after.join(", ")}] and the picture then returned to the real state. ${current()} Never claim the data changed again. Then: ${afterNote}`;
      }
      if (!(await replayEvent(ev))) return "That example could not be replayed.";
      return `Replayed the example: ${ev.description}. ${stateLine(ev)} ${current()} ${afterNote}`;
    },
    async trace_previous_transition() {
      const id = lessonId();
      const here = focused() ?? state.pos.nodeId;
      if (!here) return "No part is in focus yet. Use revisit_node first.";
      enterRevisit();
      const tr = latest((e) => e.eventType === "animate_transfer" && e.args.to_id === here) || latest((e) => e.eventType === "animate_transfer");
      let from = tr?.args.from_id;
      let to = tr?.args.to_id ?? here;
      if (!tr) {
        const st = latest((e) => e.eventType === "play_step" && e.nodeId === here);
        const s = st && seq()[Number(st.stepId.slice(5)) - 1];
        if (s?.from && s?.to) [from, to] = [s.from, s.to];
        else {
          const idx = seqIndex(here);
          const prev = idx > 0 ? nodeForStep(seq()[idx - 1], idx - 1) : null;
          from = prev && prev !== here ? prev : [...hist.focused].reverse().find((n) => n !== here);
        }
      }
      if (!from || !find(from) || !find(to) || from === to) return `There is no earlier connection into "${labelOf(here)}" to trace. Explain it in words.`;
      await api.guided().overview();
      await delay(300);
      if (tr) await replayEvent(tr);
      else
        await withRestore(async () => {
          const cam = api.guided().travelTo(to, seqIndex(to), { follow: true, from, showDot: false });
          await Promise.all([cam, api.canvas()?.transfer(from, to, "data")]);
          await api.canvas()?.highlightNode(to);
        });
      return `Showed the connection from "${labelOf(from)}" to "${labelOf(to)}"${tr ? ` and replayed "${tr.args.value}" moving along it` : ""}. ${current()} Explain how the student got from "${labelOf(from)}" to "${labelOf(to)}". ${afterNote}`;
    },
    async explain_state_change({ node_id, step_id }) {
      const id = lessonId();
      let ev = hist.resolve(id, step_id);
      if (!ev && node_id) {
        const bad = needNode(node_id);
        if (bad) return bad;
        ev = latest((e) => ["ds_operation", "update_node_state", "animate_transfer"].includes(e.eventType) && hist.touches(e, node_id));
      }
      if (!ev) ev = latest((e) => ["ds_operation", "update_node_state"].includes(e.eventType));
      if (!ev) return "Nothing has changed yet, so there is no state change to explain.";
      enterRevisit();
      await replayEvent(ev);
      return `Replayed: ${ev.description}. ${stateLine(ev)} What changed: ${diffText(ev.stateBefore, ev.stateAfter)}. ${current()} Explain why the value changed, using only these recorded values. ${afterNote}`;
    },
    async compare_states({ before_step_id, after_step_id }) {
      const id = lessonId();
      const a = hist.resolve(id, before_step_id) || hist.resolve(id, after_step_id);
      const b = hist.resolve(id, after_step_id) || a;
      if (!a) return `No recorded step to compare. Recorded: ${hist.brief(id, labelOf, 8) || "nothing yet"}.`;
      // Same step twice: show that step's own before and after.
      const left = a === b ? a.stateBefore : a.stateAfter;
      const right = b.stateAfter;
      enterRevisit();
      const nodeId = b.nodeId && find(b.nodeId) ? b.nodeId : null;
      if (nodeId) await goTo(nodeId);
      await withRestore(async () => {
        applySnapshot(left);
        nodeId && (await api.canvas()?.highlightNode(nodeId));
        await delay(1400);
        applySnapshot(right);
        nodeId && (await api.canvas()?.highlightNode(nodeId));
      });
      return `Showed the earlier state, then the later one. Difference: ${diffText(left, right)}. ${current()} Explain the difference. ${afterNote}`;
    },
    async return_to_previous_focus() {
      let target = state.returnTo;
      if (!target || !find(target)) target = [...hist.focused].reverse().find((n) => n !== focused() && find(n));
      if (!target) return "There is no earlier focus to return to.";
      await goTo(target);
      reconcile();
      return `The camera returned to "${labelOf(target)}", where the lesson was before the detour. ${current()} Continue explaining, or call resume_original_teaching_path to carry on with the lesson.`;
    },
    async resume_original_teaching_path() {
      const id = lessonId();
      const wasRevisiting = state.revisiting;
      state.revisiting = false;
      state.returnTo = null;
      applySnapshot(hist.committed);
      reconcile();
      const cur = state.pos.nodeId || focused();
      const nextN = state.pos.stepN + 1;
      const s = seq();
      const hasNext = nextN <= s.length;
      const nextNode = hasNext ? nodeForStep(s[nextN - 1], nextN - 1) : null;
      if (nextNode && cur && nextNode !== cur) await api.guided().travelTo(nextNode, nextN - 1, { follow: true, from: cur, showDot: true });
      else if (cur) await goTo(cur);
      const d = getDs();
      const plan = d ? d.meta.plan.map((p) => `${p.op}(${p.value ?? ""})`).join(", ") : "";
      return `The lesson continues on its original path${wasRevisiting ? " after the review" : ""}. The picture shows the real current state. ${current()} ${
        hasNext
          ? `Everything up to step ${state.pos.stepN} is already done and will not run again. Next: call play_step(${nextN}).`
          : d
            ? `All numbered steps are done. Operations already run: ${d.ops.length}. Continue with new operations only; never repeat one already completed (planned demo: ${plan}).`
            : `All steps are done. Check understanding, asking exactly: "Does that make sense?"`
      } Lesson events so far: ${hist.brief(id, labelOf, 5)}.`;
    },
    async get_teaching_history() {
      const id = lessonId();
      const q = hist.students.slice(-4).map((s) => `"${s.text}"`).join("; ");
      const cam = hist.camera.slice(-6).map((c) => labelOf(c.nodeId)).join(" -> ");
      return `Teaching history: ${hist.brief(id, labelOf, 12) || "nothing yet"}. Camera path: ${cam || "none"}. Recent student questions: ${q || "none"}. ${current()} ${state.revisiting ? `A review is in progress; the original position is "${labelOf(state.pos.nodeId)}", step ${state.pos.stepN}.` : `Current teaching position: "${labelOf(state.pos.nodeId)}", step ${state.pos.stepN}.`} Use ids from this list in replay_step / replay_example / explain_state_change / compare_states.`;
    }
  };

  return { commands, track, state, snapshot };
}