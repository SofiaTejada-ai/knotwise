import { TEMPLATES } from "./technicalTemplates";

// Technical-visual policy: literal diagrams first. Every generated diagram is
// validated before it reaches the canvas; if it fails, a deterministic
// technical diagram is used instead of anything metaphorical.

const METAPHOR = /\b(drawer|treasure|chest|vault|padlock|piggy|backpack|jar)\b/i;

// Essential entities a diagram must contain for known topics.
const REQUIRED = [
  {
    when: /sql\s*-?\s*injection|sqli\b/i,
    groups: [/app|server|backend/i, /database|\bdb\b/i, /input|payload|attacker|user|form/i, /query|sql/i]
  }
];

export function matchTemplate(text) {
  return TEMPLATES.find((t) => t.match.test(text || "")) || null;
}

export function templateSegments(template) {
  const segs = template.steps.map((s) => ({ ...s }));
  segs.visual = { nodes: template.nodes, edges: template.edges, title: template.title, source: "template" };
  return segs;
}

export function validateVisual(visual, steps, topicText = "") {
  const problems = [];
  const nodes = visual?.nodes ?? [];
  const edges = visual?.edges ?? [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeIds = new Set(edges.map((e) => e.id));
  if (nodes.length < 3) problems.push("too few components");
  if (nodeIds.size !== nodes.length) problems.push("duplicate component ids");
  if (edges.length < 2) problems.push("too few relationships");
  if (edges.some((e) => !nodeIds.has(e.from) || !nodeIds.has(e.to))) problems.push("dangling arrow");
  if (nodes.some((n) => METAPHOR.test(n.label))) problems.push("metaphorical component");
  if (steps.length < 2) problems.push("too few steps");
  steps.forEach((s) => {
    const ids = [...(s.nodes ?? [])];
    const eids = [...(s.edges ?? [])];
    if (!ids.length && !eids.length) problems.push("step highlights nothing");
    if (ids.some((id) => !nodeIds.has(id)) || eids.some((id) => !edgeIds.has(id))) problems.push("step points at a missing part");
  });
  REQUIRED.forEach((rule) => {
    if (!rule.when.test(topicText)) return;
    const labels = nodes.map((n) => n.label).join(" | ");
    rule.groups.forEach((g) => {
      if (!g.test(labels)) problems.push(`missing essential part ${g}`);
    });
  });
  return problems;
}

// Last-resort deterministic diagram: the steps themselves as a connected flow.
export function chainFallback(steps) {
  const used = steps.slice(0, 6);
  if (!used.length) return null;
  const nodes = used.map((s, i) => ({ id: `s${i}`, label: s.idea || `Step ${i + 1}`, kind: "process" }));
  const edges = used.slice(1).map((_, i) => ({ id: `f${i}`, from: `s${i}`, to: `s${i + 1}`, label: "" }));
  const segs = used.map((s, i) => ({
    idea: s.idea,
    spokenText: s.spokenText,
    nodes: [`s${i}`],
    edges: i > 0 ? [`f${i - 1}`] : [],
    callout: s.callout ?? null
  }));
  segs.visual = { nodes, edges, source: "fallback" };
  return segs;
}

// Turns the backend response into validated segments (with .visual attached).
export function toSegments(data, topicText) {
  const raw = data?.presentation;
  const steps = (raw?.segments ?? []).filter((s) => s && s.spokenText);
  const visual = raw?.visual;
  if (visual && !validateVisual(visual, steps, topicText).length) {
    const segs = steps.map((s) => ({ ...s }));
    segs.visual = { ...visual, source: "generated" };
    return segs;
  }
  const tpl = matchTemplate(topicText);
  if (tpl) return templateSegments(tpl);
  return chainFallback(steps);
}