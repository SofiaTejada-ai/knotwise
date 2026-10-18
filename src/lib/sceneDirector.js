import { nodeForStep } from "@/hooks/useGuidedLesson";

// Scene Director: turns the professor's structured visual commands into the
// supported GSAP animations. Nothing here runs model-written code. Every
// command is validated against the real scene, runs through one queue so
// dependent animations never overlap, and resolves only when the visual has
// actually finished (that result is the professor's completion event).

export const DIRECTOR_TOOL_NAMES = [
  "focus_node",
  "show_overview",
  "highlight_node",
  "follow_connection",
  "animate_transfer",
  "update_node_state",
  "play_step",
  "pause_visuals",
  "resume_visuals"
];

const STATE_KEYS = ["items", "value", "label", "color", "text"];
const TIMEOUT_MS = 20000;

export function createDirector(api) {
  let chain = Promise.resolve();
  let epoch = 0;
  let paused = false;
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

  const commands = {
    async focus_node({ node_id }) {
      const bad = needNode(node_id);
      if (bad) return bad;
      await api.guided().travelTo(node_id, seqIndex(node_id), { follow: false });
      return `The camera is on "${labelOf(node_id)}" and a simple picture of it is appearing above it. Explain this part now.`;
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
      api.tutor().updateObject(node_id, clean);
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
      await new Promise((r) => setTimeout(r, 300)); // let playback begin
      await Promise.all([cam, api.waitIdle(15000)]);
      const last = idx === seq.length - 1;
      return `Step ${n} of ${seq.length} has finished on screen: ${step.description || step.action}. ${
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
    }
  };

  const run = (name, args = {}) => {
    const fn = commands[name];
    if (!fn) return Promise.resolve(`Unknown visual command ${name}.`);
    if (name === "pause_visuals" || name === "resume_visuals") return fn(args);
    // Issuing a new visual command means the lesson continues.
    if (paused) setPaused(false);
    const my = epoch;
    const job = chain.then(async () => {
      if (my !== epoch) return "Cancelled because the student interrupted. Answer them, then continue from the current state.";
      history.push({ name, args, at: Date.now() });
      try {
        return await Promise.race([
          fn(args),
          new Promise((r) => setTimeout(() => r("The visual is still finishing. Keep explaining."), TIMEOUT_MS))
        ]);
      } catch (err) {
        return "That visual could not run. Keep explaining in words.";
      }
    });
    chain = job.catch(() => {});
    return job;
  };

  // Student interruption: drop queued commands, freeze what is playing and
  // keep the last committed state. Nothing is replayed on resume.
  const interrupt = () => {
    epoch += 1;
    setPaused(true);
  };

  return { run, interrupt, history, isPaused: () => paused };
}