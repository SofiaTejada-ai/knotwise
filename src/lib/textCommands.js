import { DUR, scaled } from "@/lib/animTiming";
import { checkSteps, prettyMath } from "@/lib/mathCheck";

// Professor commands that put the ACTUAL information on screen as native text:
// SQL, code, equations, values. Every error starts with "Not done:" so the
// professor (and the history) know nothing happened.

export const TEXT_TOOL_NAMES = ["show_text", "hide_text", "update_text", "highlight_token", "move_value", "replace_expression", "transform_equation"];
export const TEXT_KINDS = ["text_label", "code_block", "math_expression", "variable_value", "array_cell", "expression_token"];

const ID = /^[a-z0-9_]{1,30}$/;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (kind, s) => {
  const t = String(s ?? "").slice(0, 400);
  return (kind === "math_expression" ? prettyMath(t) : t).split("\n").slice(0, 10).join("\n");
};

export function createTextCommands({ api, find, needNode, dsStructId }) {
  const texts = () => (api.scene()?.objects ?? []).filter((o) => TEXT_KINDS.includes(o.type));
  const tutor = () => api.tutor();
  // Let React draw a new object before the camera looks at it.
  const look = async (id, z = 1.35) => {
    await delay(90);
    await api.canvas()?.focusNode(id, z);
  };
  const emphasize = (id) => api.canvas()?.highlightNode(id);
  const place = (near_id, x, y) => {
    if (Number.isFinite(Number(x)) && Number.isFinite(Number(y)) && x !== null && y !== null && x !== "" && y !== "")
      return { x: clamp(Number(x), 60, 840), y: clamp(Number(y), 40, 510) };
    const n = near_id && find(near_id);
    if (n) return { x: clamp(n.x, 140, 760), y: clamp(n.y + 105, 40, 515) };
    return { x: 450, y: 60 + (texts().length % 6) * 72 };
  };
  const listing = () => texts().map((o) => `${o.id}: ${o.text}`).join("; ") || "none";
  const notText = (id) => {
    const o = find(id);
    if (!o) return `Not done: there is no text object "${id}". Text on screen: ${listing()}. Use show_text first.`;
    return TEXT_KINDS.includes(o.type) ? null : `Not done: "${id}" is a diagram part, not text.`;
  };
  const showSteps = async (id, steps) => {
    for (const s of steps) {
      tutor().updateObject(id, { text: s.expression, highlight: "" });
      await emphasize(id);
      await delay(scaled(DUR.emphasis + 0.9) * 1000);
    }
  };

  const commands = {
    async show_text({ id, kind = "text_label", content, near_id, x, y, label }) {
      if (!ID.test(String(id ?? ""))) return "Not done: give the text a short id of lowercase letters, digits or _ (for example sql_query).";
      if (!TEXT_KINDS.includes(kind)) return `Not done: supported kinds are ${TEXT_KINDS.join(", ")}.`;
      const text = clean(kind, content);
      if (!text.trim()) return "Not done: give the exact content to show.";
      if (near_id && needNode(near_id)) return `Not done: ${needNode(near_id)}`;
      const ex = find(id);
      if (ex && !TEXT_KINDS.includes(ex.type)) return `Not done: "${id}" is already a diagram part. Choose another id.`;
      const lbl = label ? String(label).slice(0, 24) : ex?.label ?? "";
      if (ex) tutor().updateObject(id, { type: kind, text, highlight: "", label: lbl });
      else tutor().addObject({ id, type: kind, text, highlight: "", label: lbl, ...place(near_id, x, y) });
      await look(id);
      await emphasize(id);
      return `On screen now (${kind} "${id}"): ${text}. Explain it, and use highlight_token to point at an exact part of it.`;
    },
    async hide_text({ id }) {
      const bad = notText(id);
      if (bad) return bad;
      tutor().removeObject(id);
      return `"${id}" was removed from the screen.`;
    },
    async update_text({ id, content }) {
      const bad = notText(id);
      if (bad) return bad;
      const o = find(id);
      const text = clean(o.type, content);
      if (!text.trim()) return "Not done: give the new content.";
      tutor().updateObject(id, { text, highlight: "" });
      await look(id);
      await emphasize(id);
      return `"${id}" changed from "${o.text}" to "${text}". It is visible now. Explain why it changed.`;
    },
    async replace_expression({ id, content }) {
      const bad = notText(id);
      if (bad) return bad;
      const o = find(id);
      const text = clean(o.type, content);
      if (!text.trim()) return "Not done: give the new expression.";
      await look(id);
      tutor().updateObject(id, { highlight: o.text });
      await delay(scaled(DUR.emphasis) * 1000);
      tutor().updateObject(id, { text, highlight: "" });
      await emphasize(id);
      return `The expression "${o.text}" was replaced by "${text}" on screen. Explain the step.`;
    },
    async highlight_token({ id, token }) {
      const bad = notText(id);
      if (bad) return bad;
      const o = find(id);
      const t = String(token ?? "");
      let exact = t && o.text.includes(t) ? t : null;
      if (!exact && t) {
        const i = o.text.toLowerCase().indexOf(t.toLowerCase());
        if (i >= 0) exact = o.text.slice(i, i + t.length);
      }
      if (!exact) return `Not done: "${t}" does not appear in "${id}". Its exact content is: ${o.text}`;
      tutor().updateObject(id, { highlight: exact });
      await look(id);
      await emphasize(id);
      return `"${exact}" is highlighted inside "${o.text}". Explain why this part matters.`;
    },
    async move_value({ value, from_id, to_id }) {
      const bad = needNode(from_id) || needNode(to_id);
      if (bad) return `Not done: ${bad}`;
      const sid = dsStructId();
      if (sid && (to_id === sid || from_id === sid))
        return "Not done: that box is a real data structure. Use ds_operation, which moves the exact value and keeps the real state.";
      const v = String(value ?? "").slice(0, 24);
      if (!v.trim()) return "Not done: give the exact value to move.";
      await Promise.all([api.canvas()?.followConnection(from_id, to_id, { showDot: false }), api.canvas()?.transfer(from_id, to_id, v)]);
      const target = find(to_id);
      if (target?.type === "array_cell") tutor().updateObject(to_id, { text: v, highlight: "" });
      await emphasize(to_id);
      return `The value "${v}" moved from "${from_id}" into "${to_id}"${target?.type === "array_cell" ? ", which now shows it" : ""}. Explain what this means.`;
    },
    async transform_equation(args) {
      const { id, steps, near_id } = args;
      if (!ID.test(String(id ?? ""))) return "Not done: give the equation a short id (for example eq1).";
      const list = (Array.isArray(steps) ? steps : [])
        .slice(0, 6)
        .map((s) => ({ expression: clean("math_expression", s?.expression ?? s), explanation: String(s?.explanation ?? "").slice(0, 120) }))
        .filter((s) => s.expression.trim());
      if (list.length < 2) return "Not done: give at least two steps, each with an expression.";
      const chk = checkSteps(list.map((s) => s.expression));
      if (!chk.ok)
        return `Not done: step ${chk.badStep} "${list[chk.badStep - 1].expression}" is not valid, because x = ${chk.x} solves the final step but not this one. Fix the steps and call again.`;
      const ex = find(id);
      if (ex && !TEXT_KINDS.includes(ex.type)) return `Not done: "${id}" is a diagram part.`;
      if (!ex) tutor().addObject({ id, type: "math_expression", text: list[0].expression, highlight: "", label: "", ...place(near_id) });
      args._steps = list; // kept for exact replays
      await look(id);
      await showSteps(id, list);
      return `The equation steps were shown one after another; the last one stays on screen: ${list
        .map((s, i) => `${i + 1}. ${s.expression}${s.explanation ? ` (${s.explanation})` : ""}`)
        .join("; ")}. ${chk.checked ? "Each step was checked against the final answer." : ""} Explain each transformation.`;
    }
  };

  // Visual replay of a recorded text event (never changes the committed state;
  // the caller restores the current picture afterwards).
  const replay = async (ev, applySnapshot) => {
    const a = ev.args ?? {};
    if (ev.eventType === "move_value") {
      await Promise.all([api.canvas()?.followConnection(a.from_id, a.to_id, { showDot: false }), api.canvas()?.transfer(a.from_id, a.to_id, String(a.value))]);
      applySnapshot(ev.stateAfter);
      await emphasize(a.to_id);
      return;
    }
    let added = false;
    if (!find(a.id)) {
      tutor().addObject({ id: a.id, type: a.kind || "math_expression", text: "", highlight: "", label: "", ...place(a.near_id, a.x, a.y) });
      added = true;
    }
    applySnapshot(ev.stateBefore);
    await look(a.id);
    if (ev.eventType === "transform_equation") await showSteps(a.id, a._steps ?? []);
    else {
      await delay(scaled(0.6) * 1000);
      applySnapshot(ev.stateAfter);
      await emphasize(a.id);
      await delay(scaled(0.8) * 1000);
    }
    if (added) tutor().removeObject(a.id);
  };

  return { commands, replay };
}