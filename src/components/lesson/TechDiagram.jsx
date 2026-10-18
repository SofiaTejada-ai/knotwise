import React from "react";
import DiagramCallout from "./DiagramCallout";

// Deterministic SVG renderer for technical diagrams. Highlighting and moving
// packets are instant frontend state changes driven by the current step, so
// they never wait for the network.

const W = 190;
const H = 72;
const CW = 290;
const CH = 170;
const PAD = 20;

const KIND = {
  client: "fill-sky-50 stroke-sky-500",
  attacker: "fill-red-50 stroke-red-500",
  server: "fill-indigo-50 stroke-indigo-500",
  database: "fill-emerald-50 stroke-emerald-600",
  process: "fill-amber-50 stroke-amber-500",
  data: "fill-violet-50 stroke-violet-500",
  result: "fill-teal-50 stroke-teal-500",
  concept: "fill-slate-50 stroke-slate-500"
};

function wrap(text, max = 18, maxLines = 3) {
  const lines = [];
  let cur = "";
  String(text || "").split(/\s+/).forEach((w) => {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  });
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

function layout(nodes) {
  const n = nodes.length;
  const explicit = nodes.some((x) => x.pos);
  const cols = explicit ? Math.max(...nodes.map((x) => x.pos?.[0] ?? 0)) + 1 : n <= 3 ? n : n <= 6 ? 3 : 4;
  const placed = {};
  let rows = 1;
  nodes.forEach((node, i) => {
    const [c, r] = node.pos ?? [i % cols, Math.floor(i / cols)];
    rows = Math.max(rows, r + 1);
    placed[node.id] = { x: PAD + c * CW + CW / 2, y: PAD + r * CH + CH / 2 };
  });
  return { placed, width: cols * CW + PAD * 2, height: rows * CH + PAD * 2 };
}

// Point on the node's rectangle border toward (tx, ty).
function edgePoint(from, to, gap = 6) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const t = Math.min(dx ? W / 2 / Math.abs(dx) : Infinity, dy ? H / 2 / Math.abs(dy) : Infinity);
  const len = Math.hypot(dx, dy) || 1;
  return { x: from.x + dx * t + (dx / len) * gap, y: from.y + dy * t + (dy / len) * gap };
}

export default function TechDiagram({ visual, steps = [], stepIndex = null, onNodeClick, reducedMotion = false }) {
  const nodes = visual?.nodes ?? [];
  const edges = visual?.edges ?? [];
  const { placed, width, height } = layout(nodes);
  const step = stepIndex != null ? steps[stepIndex] : null;
  const litNodes = new Set(step?.nodes ?? []);
  const litEdges = new Set(step?.edges ?? []);
  const danger = step?.callout?.lines?.some((l) => l.tone === "danger");

  return (
    <div data-testid="tech-diagram" className="w-full max-w-4xl">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={visual?.title || "Technical diagram"}
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        <defs>
          {[
            ["dim", "fill-slate-300"],
            ["on", "fill-slate-800"],
            ["bad", "fill-red-500"]
          ].map(([id, cls]) => (
            <marker key={id} id={`arrow-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className={cls} />
            </marker>
          ))}
        </defs>

        {edges.map((e) => {
          const a = placed[e.from];
          const b = placed[e.to];
          if (!a || !b) return null;
          const p1 = edgePoint(a, b);
          const p2 = edgePoint(b, a);
          const on = litEdges.has(e.id);
          const dim = step && !on;
          const bad = on && danger;
          const marker = bad ? "bad" : on ? "on" : "dim";
          const cls = bad ? "stroke-red-500" : on ? "stroke-slate-800" : "stroke-slate-300";
          return (
            <g key={e.id} data-edge={e.id} data-lit={on ? "1" : "0"} style={{ opacity: dim ? 0.4 : 1, transition: "opacity .3s" }}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={cls} strokeWidth={on ? 3 : 2} markerEnd={`url(#arrow-${marker})`} />
              {e.label && (
                <text
                  x={(p1.x + p2.x) / 2}
                  y={(p1.y + p2.y) / 2 - 6}
                  textAnchor="middle"
                  fontSize="12"
                  className="fill-slate-600"
                  stroke="white"
                  strokeWidth="5"
                  paintOrder="stroke"
                >
                  {e.label.length > 24 ? `${e.label.slice(0, 23)}…` : e.label}
                </text>
              )}
              {on && !reducedMotion && (
                <circle r="6" className={bad ? "fill-red-500" : "fill-slate-800"}>
                  <animateMotion dur="1.6s" repeatCount="indefinite" path={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`} />
                </circle>
              )}
            </g>
          );
        })}

        {nodes.map((n) => {
          const pos = placed[n.id];
          const on = litNodes.has(n.id);
          const dim = step && !on;
          const lines = wrap(n.label);
          const lh = 15;
          return (
            <g
              key={n.id}
              data-node={n.id}
              data-lit={on ? "1" : "0"}
              onClick={() => onNodeClick?.(n)}
              className="cursor-pointer focus:outline-none"
              style={{ opacity: dim ? 0.35 : 1, transition: "opacity .3s" }}
              tabIndex={0}
              role="button"
              aria-label={n.label}
              onKeyDown={(ev) => ev.key === "Enter" && onNodeClick?.(n)}
            >
              <rect
                x={pos.x - W / 2}
                y={pos.y - H / 2}
                width={W}
                height={H}
                rx={n.kind === "database" ? 30 : 8}
                strokeWidth={on ? 3.5 : 2}
                strokeDasharray={n.kind === "attacker" ? "6 4" : undefined}
                className={KIND[n.kind] || KIND.concept}
              />
              {lines.map((l, i) => (
                <text
                  key={i}
                  x={pos.x}
                  y={pos.y + (i - (lines.length - 1) / 2) * lh + 4}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight={on ? 700 : 500}
                  className="fill-slate-800"
                >
                  {l}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      <DiagramCallout callout={step?.callout} />
    </div>
  );
}