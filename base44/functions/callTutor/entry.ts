import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const OBJECT_TYPES = ["host", "packet", "firewall", "database", "router", "memory_block", "function_box", "pointer", "note", "queue", "stack", "circle", "plate", "linked_node", "bucket", "cloud", "server", "user", "lock", "key", "gear", "flag", "bug", "robot"];
const STEP_ACTIONS = ["emit_packet", "retransmit", "pulse", "annotate", "highlight_path", "timeout", "clear", "update_object"];
const RADII = { host: 40, firewall: 40, database: 36, router: 30, memory_block: 60, function_box: 70, queue: 60, stack: 50, packet: 10, user: 22, cloud: 45, server: 36, circle: 30, plate: 28, linked_node: 34, bucket: 40, note: 30, pointer: 30, lock: 22, key: 22, gear: 24, flag: 24, bug: 24, robot: 28 };

const SYSTEM_PROMPT = `You are an animation tutor inside Safe Steps, a calm app that teaches students with ADHD or autism how to spot scam text messages. You turn the student's question into an animated technical diagram.

Always respond with a JSON object: { "narration": string, "source_id": string or null, "scene": object }. Narration is 1-2 short sentences, literal words only, no exclamation marks, no jokes, no idioms. Expand acronyms on first use, for example "SYN (synchronize) packet". NEVER use em dashes or en dashes in any text, use commas or colons instead.

Scene object: { "scene_id": string, "title": string, "delta": boolean, "inject_after_step": integer, "objects": array, "sequence": array, "new_steps": array }.

Objects: each { "id": string, "type": string, "label": string, "x": 50-850, "y": 50-500 }. type is one of: host, packet, firewall, database, router, memory_block, function_box, pointer, note, queue, stack, circle, plate, linked_node, bucket, cloud, server, user, lock, key, gear, flag, bug, robot.
Optional "glow": "red" for danger (for example a buffer overflowing or an attacker) or "green" for safe or established.
Specialized shapes: memory_block has "cells" (array of cell labels, shown as 4 columns), function_box has "header" and "params" (array), pointer has "length" (default 60), note has "color" (default #f59e0b), queue has "items" array with the item values in the array (leftmost is FRONT), stack has "items" (topmost is last), linked_node has "value", bucket has "items".

Sequence steps: each { "step": integer, "action": string, "duration": 0.3-3.0 seconds, "description": one line }. action is one of: emit_packet (from, to, label, color), retransmit (from, to, label, color), pulse (target, color), annotate (target, text, color), highlight_path (from, to, color), timeout (target, label), clear, update_object (target, props: the FULL cumulative state after the change, for example the complete items array).

Rules:
- Keep item labels SHORT, 1 to 8 characters. Long explanations go in step descriptions or note objects.
- Keep sequences 4 to 8 steps, 12 at the very most.
- Colors are semantic: blue #4f9eff normal flow, green #34d399 success, amber #f59e0b warning or retry, red #ef4444 attack or failure.
- Spread objects at least 140px apart. For a two-party exchange put the two nodes at x about 150 and 750 on the same y. For a topology stagger y: 90, 200, 310, 420.
- All from, to, and target ids must exist in objects. Double-check every reference.
- If the student asks a follow-up about the current scene, return a delta: { "delta": true, "scene_id": same as current scene, "inject_after_step": integer, "new_steps": array }. Never rebuild a scene from scratch unless the topic is new.
- source_id: if the animation matches one of the approved source ids given in the context, return that id, otherwise null.`;

const STEP_ITEM = {
  type: "object",
  required: ["step", "action", "duration"],
  properties: {
    step: { type: "integer" },
    action: { type: "string", enum: STEP_ACTIONS },
    duration: { type: "number" },
    description: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    target: { type: "string" },
    label: { type: "string" },
    text: { type: "string" },
    color: { type: "string" },
    props: { type: "object" }
  }
};

const RESPONSE_SCHEMA = {
  type: "object",
  required: ["narration", "scene"],
  properties: {
    narration: { type: "string" },
    source_id: { type: "string" },
    scene: {
      type: "object",
      required: ["scene_id", "title", "delta"],
      properties: {
        scene_id: { type: "string" },
        title: { type: "string" },
        delta: { type: "boolean" },
        inject_after_step: { type: "integer" },
        objects: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "type", "label", "x", "y"],
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: OBJECT_TYPES },
              label: { type: "string" },
              x: { type: "integer" },
              y: { type: "integer" },
              glow: { type: "string", enum: ["red", "green"] },
              cells: { type: "array", items: { type: "string" } },
              header: { type: "string" },
              params: { type: "array", items: { type: "string" } },
              length: { type: "integer" },
              color: { type: "string" },
              items: { type: "array", items: { type: "string" } },
              value: { type: "string" }
            }
          }
        },
        sequence: { type: "array", items: STEP_ITEM },
        new_steps: { type: "array", items: STEP_ITEM }
      }
    }
  }
};

function clampNum(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function objectState(o) {
  return {
    cells: Array.isArray(o?.cells) ? o.cells : null,
    params: Array.isArray(o?.params) ? o.params : null,
    items: Array.isArray(o?.items) ? o.items : null,
    header: typeof o?.header === "string" ? o.header : null,
    value: typeof o?.value === "string" ? o.value : null
  };
}

// b) Causal initial state: any object later targeted by update_object starts
// empty, so a value can never appear before the step that causes it.
function applyCausalInitialState(objects, steps) {
  const updated = new Set(
    steps.filter((st) => st.action === "update_object" && st.target).map((st) => st.target)
  );
  return objects.map((o) => {
    if (!updated.has(o.id)) return o;
    return {
      ...o,
      cells: Array.isArray(o.cells) ? o.cells.map(() => "null") : undefined,
      params: undefined,
      items: undefined,
      header: undefined,
      value: undefined
    };
  });
}

// a) + c) Reference validation and stale-step filter driven by a state
// simulator (replays the scene; drops no-op updates and decorations with no
// real change behind them), then renumbers 1..N.
function filterStaleSteps(steps, objects, baseSequence) {
  const ids = new Set(objects.map((o) => o.id));
  const sim = {};
  objects.forEach((o) => { sim[o.id] = objectState(o); });
  if (Array.isArray(baseSequence)) {
    for (const st of baseSequence) {
      if (!st) continue;
      if (st.action === "update_object" && st.target && sim[st.target]) {
        sim[st.target] = { ...sim[st.target], ...(st.props && typeof st.props === "object" ? st.props : {}) };
      }
      if (st.action === "clear") {
        Object.keys(sim).forEach((k) => { sim[k] = objectState({}); });
      }
    }
  }
  const kept = [];
  for (const st of steps) {
    if (!st || !STEP_ACTIONS.includes(st.action)) continue;
    if (st.action === "update_object") {
      if (!st.target || !sim[st.target]) continue;
      const props = st.props && typeof st.props === "object" ? st.props : {};
      if (!Object.keys(props).length) continue;
      const next = { ...sim[st.target], ...props };
      if (JSON.stringify(next) === JSON.stringify(sim[st.target])) continue;
      sim[st.target] = next;
      kept.push(st);
    } else if (st.action === "emit_packet" || st.action === "retransmit") {
      if (!ids.has(st.from) || !ids.has(st.to)) continue;
      kept.push(st);
    } else if (st.action === "clear") {
      kept.push(st);
      Object.keys(sim).forEach((k) => { sim[k] = objectState({}); });
    } else {
      kept.push(st);
    }
  }
  const isReal = (st, target) =>
    (st.action === "update_object" && st.target === target) ||
    ((st.action === "emit_packet" || st.action === "retransmit") && (st.from === target || st.to === target));
  const result = [];
  for (let i = 0; i < kept.length; i++) {
    const st = kept[i];
    if (["pulse", "annotate", "highlight_path", "timeout"].includes(st.action)) {
      const target = st.target || st.to || st.from;
      if (!target || !kept.slice(i).some((k) => isReal(k, target))) continue;
    }
    result.push(st);
  }
  return result.map((st, i) => ({ ...st, step: i + 1 }));
}

// d) Collision resolution: iterative nudge pass for full scenes only.
function resolveCollisions(objects) {
  const pts = objects.map((o) => ({ ...o }));
  for (let iter = 0; iter < 30; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const ra = RADII[a.type] ?? 34;
        const rb = RADII[b.type] ?? 34;
        const min = ra + rb + 20;
        const d = Math.hypot(dx, dy);
        if (d < min) {
          const push = (min - d) / 2 + 0.5;
          const nx = d === 0 ? 1 : dx / d;
          const ny = d === 0 ? 0 : dy / d;
          a.x = clampNum(a.x - nx * push, 70, 830);
          a.y = clampNum(a.y - ny * push, 60, 490);
          b.x = clampNum(b.x + nx * push, 70, 830);
          b.y = clampNum(b.y + ny * push, 60, 490);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return pts;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Signed-out visitors may use the tutor (the app is public); a signed-in user is optional.
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 800) : "";
    if (!prompt.trim()) return Response.json({ error: "A question is required" }, { status: 400 });
    const currentScene = body.currentScene && typeof body.currentScene === "object" ? body.currentScene : null;
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const groundingText = typeof body.groundingText === "string" ? body.groundingText.slice(0, 3000) : "";
    const approved = groundingText ? [] : (Array.isArray(body.approvedSources) ? body.approvedSources.slice(0, 10) : []);

    const context = [];
    if (currentScene) context.push("CURRENT SCENE JSON:\n" + JSON.stringify(currentScene).slice(0, 6000));
    if (history.length) {
      context.push(
        "CONVERSATION HISTORY:\n" +
        history.map((h) => `${h?.role}: ${h?.text}`).join("\n").slice(0, 2000)
      );
    }
    if (approved.length) {
      context.push(
        "APPROVED SOURCES (choose source_id from these ids only, or null):\n" +
        approved.map((s) => `${s.id}: ${s.passage}`).join("\n").slice(0, 1500)
      );
    }

    let system = SYSTEM_PROMPT;
    if (groundingText) {
      system = system.replace(
        /^You are an animation tutor inside Safe Steps[^\n]*/,
        "You are an animation tutor inside Knotwise. You turn one topic from the student's own uploaded document into an animated diagram. Use ONLY the DOCUMENT MATERIAL below. Never add outside facts. Objects and step descriptions must show how the ideas in the material relate or happen in order."
      );
      context.push("DOCUMENT MATERIAL:\n" + groundingText);
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: system + (context.length ? "\n\n" + context.join("\n\n") : "") + "\n\nSTUDENT QUESTION: " + prompt,
      response_json_schema: RESPONSE_SCHEMA
    });

    const narration = typeof result.narration === "string" ? result.narration.slice(0, 400) : "";
    let sc = result.scene;
    if (!sc || typeof sc !== "object") {
      return Response.json({ error: "Animation generation failed" }, { status: 200 });
    }
    const hasObjects = Array.isArray(sc.objects) && sc.objects.length > 0;
    const isDelta = sc.delta === true && !!currentScene && !hasObjects;

    let scene;
    if (isDelta) {
      const newSteps = Array.isArray(sc.new_steps) ? sc.new_steps : [];
      const filtered = filterStaleSteps(newSteps, currentScene.objects ?? [], currentScene.sequence ?? []);
      scene = {
        delta: true,
        scene_id: sc.scene_id || currentScene.scene_id,
        title: currentScene.title,
        inject_after_step: typeof sc.inject_after_step === "number" ? sc.inject_after_step : null,
        new_steps: filtered
      };
    } else {
      const objects = (hasObjects ? sc.objects : []).map((o) => ({
        ...o,
        x: clampNum(o.x, 70, 830),
        y: clampNum(o.y, 60, 490)
      }));
      const steps = Array.isArray(sc.sequence) ? sc.sequence : [];
      const causal = applyCausalInitialState(objects, steps);
      const filtered = filterStaleSteps(steps, causal, null);
      scene = {
        scene_id: sc.scene_id || ("scene-" + Date.now()),
        title: typeof sc.title === "string" ? sc.title.slice(0, 80) : "Animation",
        delta: false,
        objects: resolveCollisions(causal),
        sequence: filtered
      };
    }

    const src = approved.find((s) => s && s.id === result.source_id) || null;
    return Response.json({
      narration,
      scene,
      source: src
        ? { id: src.id, passage: src.passage, publisher: src.publisher, title: src.title, date: src.date, url: src.url }
        : null
    });
  } catch (error) {
    return Response.json({ error: String(error?.message ?? error) }, { status: 500 });
  }
}