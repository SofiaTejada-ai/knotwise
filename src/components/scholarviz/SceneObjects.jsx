import React from "react";
import TextObject from "./TextObject";

export const MONO = "JetBrains Mono, ui-monospace, monospace";
export const UI = "Inter, ui-sans-serif, system-ui, sans-serif";

// Wrap on word boundaries AND hard-break words longer than maxChars, so text
// never overflows its box.
export function wrapLines(text, maxChars = 18) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  const push = () => {
    if (cur) {
      lines.push(cur);
      cur = "";
    }
  };
  for (let w of words) {
    while (w.length > maxChars) {
      push();
      lines.push(w.slice(0, maxChars));
      w = w.slice(maxChars);
    }
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur += " " + w;
    else {
      push();
      cur = w;
    }
  }
  push();
  return lines.length ? lines : [""];
}

const cellsLayout = (cells) => {
  const wrapped = cells.map((c) => wrapLines(String(c), 14));
  const maxLine = Math.max(2, ...wrapped.flatMap((l) => l.map((x) => x.length)));
  const cellW = Math.max(32, maxLine * 7 + 10);
  const rows = Math.max(1, ...wrapped.map((l) => l.length));
  return { wrapped, cellW, rows, cellH: rows * 16 + 8 };
};

function Host() {
  return (
    <g>
      <rect x="-55" y="-30" width="110" height="60" rx="8" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
      <rect x="-34" y="-21" width="68" height="30" rx="3" fill="#bfdbfe" />
      <rect x="-18" y="14" width="36" height="6" rx="2" fill="#93c5fd" />
    </g>
  );
}

function Firewall() {
  return (
    <g>
      <rect x="-60" y="-32" width="120" height="64" rx="4" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.5" />
      {[-16, 0, 16].map((y) => (
        <line key={y} x1="-60" y1={y} x2="60" y2={y} stroke="#fca5a5" strokeWidth="1" />
      ))}
      <line x1="-30" y1="-32" x2="-30" y2="-16" stroke="#fca5a5" strokeWidth="1" />
      <line x1="30" y1="-16" x2="30" y2="0" stroke="#fca5a5" strokeWidth="1" />
      <line x1="-30" y1="0" x2="-30" y2="16" stroke="#fca5a5" strokeWidth="1" />
      <line x1="30" y1="16" x2="30" y2="32" stroke="#fca5a5" strokeWidth="1" />
      <text y="4" textAnchor="middle" fontSize="12" fontWeight="700" fill="#b91c1c" fontFamily={MONO}>FW</text>
    </g>
  );
}

function Database() {
  return (
    <g>
      <path d="M -34 -22 a 34 10 0 0 0 68 0 v 40 a 34 10 0 0 1 -68 0 z" fill="#ecfeff" stroke="#06b6d4" strokeWidth="1.5" />
      <ellipse cx="0" cy="-22" rx="34" ry="10" fill="#cffafe" stroke="#06b6d4" strokeWidth="1.5" />
      <line x1="-34" y1="-6" x2="34" y2="-6" stroke="#a5f3fc" strokeWidth="1" />
      <line x1="-34" y1="8" x2="34" y2="8" stroke="#a5f3fc" strokeWidth="1" />
    </g>
  );
}

function Router() {
  return (
    <g>
      <rect x="-55" y="-22" width="110" height="44" rx="22" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
      <circle cx="-28" cy="-11" r="4" fill="none" stroke="#16a34a" strokeWidth="1.5" />
      <path d="M -18 0 h 34 m -9 -6 l 9 6 l -9 6" fill="none" stroke="#16a34a" strokeWidth="2" />
      <circle cx="36" cy="-11" r="4" fill="none" stroke="#16a34a" strokeWidth="1.5" />
    </g>
  );
}

function MemoryBlock({ obj }) {
  const cells = Array.isArray(obj.cells) ? obj.cells : ["", "", "", ""];
  const { wrapped, cellW, rows, cellH } = cellsLayout(cells);
  const w = cellW * 4;
  const h = cellH;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
      {[1, 2, 3].map((i) => (
        <line key={i} x1={-w / 2 + i * cellW} y1={-h / 2} x2={-w / 2 + i * cellW} y2={h / 2} stroke="#cbd5e1" strokeWidth="1" />
      ))}
      {wrapped.map((lines, ci) =>
        lines.map((ln, li) => (
          <text
            key={`${ci}-${li}`}
            x={-w / 2 + ci * cellW + cellW / 2}
            y={-h / 2 + 12 + li * 16}
            textAnchor="middle"
            fontSize="10"
            fontFamily={MONO}
            fill="#334155"
          >
            {ln}
          </text>
        ))
      )}
    </g>
  );
}

function FunctionBox({ obj }) {
  const params = Array.isArray(obj.params) ? obj.params.map(String) : [];
  const lines = [String(obj.header ?? ""), ...params];
  const maxLen = Math.max(6, ...lines.map((l) => l.length));
  const w = Math.max(90, maxLen * 7 + 16);
  const h = 24 + params.length * 20 + 8;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
      <path d={`M ${-w / 2} ${-h / 2 + 24} h ${w}`} stroke="#64748b" strokeWidth="1" />
      <rect x={-w / 2} y={-h / 2} width={w} height={24} rx="6" fill="#eff6ff" />
      <rect x={-w / 2} y={-h / 2 + 18} width={w} height={6} fill="#eff6ff" />
      <text x="0" y={-h / 2 + 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e40af" fontFamily={MONO}>
        {obj.header ?? ""}
      </text>
      {params.map((p, i) => (
        <text key={i} x="0" y={-h / 2 + 40 + i * 20} textAnchor="middle" fontSize="10" fill="#334155" fontFamily={MONO}>
          {p}
        </text>
      ))}
    </g>
  );
}

function Pointer({ obj }) {
  const len = Math.max(30, Math.min(160, Number(obj.length) || 60));
  return (
    <g>
      <line x1={-len / 2} y1="0" x2={len / 2 - 12} y2="0" stroke="#475569" strokeWidth="2.5" />
      <path d={`M ${len / 2 - 14} -7 L ${len / 2} 0 L ${len / 2 - 14} 7 z`} fill="#475569" />
      {obj.label ? (
        <text y="-10" textAnchor="middle" fontSize="10" fill="#475569" fontFamily={MONO}>{obj.label}</text>
      ) : null}
    </g>
  );
}

function Note({ obj }) {
  const lines = wrapLines(obj.label ?? "", 14);
  const color = obj.color || "#f59e0b";
  return (
    <g>
      <path d="M -45 -30 h 90 v 52 l -14 14 h -76 z" fill="#fffbeb" stroke={color} strokeWidth="1" />
      <path d="M 45 22 l -14 14 v -14 z" fill="#fde68a" stroke={color} strokeWidth="1" />
      {lines.map((ln, i) => (
        <text key={i} y={-16 + i * 14} textAnchor="middle" fontSize="10" fill="#78350f" fontFamily={MONO}>{ln}</text>
      ))}
    </g>
  );
}

function Queue({ obj }) {
  const items = Array.isArray(obj.items) ? obj.items : [];
  const { wrapped, cellW, rows, cellH } = cellsLayout(items.length ? items : [""]);
  const w = Math.max(cellW, items.length * cellW);
  const h = cellH;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill="#f0fdfa" stroke="#14b8a6" strokeWidth="1.5" />
      {items.slice(1).map((it, i) => (
        <line key={i} x1={-w / 2 + (i + 1) * cellW} y1={-h / 2} x2={-w / 2 + (i + 1) * cellW} y2={h / 2} stroke="#99f6e4" strokeWidth="1" />
      ))}
      {wrapped.map((lines, ci) =>
        lines.map((ln, li) => (
          <text
            key={`${ci}-${li}`}
            x={-w / 2 + ci * cellW + cellW / 2}
            y={-h / 2 + 12 + li * 16}
            textAnchor="middle"
            fontSize="10"
            fontFamily={MONO}
            fill="#134e4a"
          >
            {ln}
          </text>
        ))
      )}
      <text x={-w / 2} y={h / 2 + 12} textAnchor="middle" fontSize="9" fill="#0f766e" fontFamily={MONO}>FRONT</text>
      <text x={w / 2} y={h / 2 + 12} textAnchor="middle" fontSize="9" fill="#0f766e" fontFamily={MONO}>BACK</text>
    </g>
  );
}

function Stack({ obj }) {
  const items = Array.isArray(obj.items) ? obj.items.map(String) : [];
  const maxLen = Math.max(4, ...items.map((i) => i.length), 4);
  const w = Math.max(70, maxLen * 7 + 16);
  const cellH = 22;
  const h = Math.max(cellH, items.length * cellH);
  return (
    <g>
      <text x="0" y={-h / 2 - 6} textAnchor="middle" fontSize="9" fill="#9a3412" fontFamily={MONO}>TOP</text>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill="#fff7ed" stroke="#f97316" strokeWidth="1.5" />
      {items.slice(1).map((it, i) => (
        <line key={i} x1={-w / 2} y1={-h / 2 + (i + 1) * cellH} x2={w / 2} y2={-h / 2 + (i + 1) * cellH} stroke="#fed7aa" strokeWidth="1" />
      ))}
      {items.map((it, i) => (
        <text key={i} x="0" y={-h / 2 + 15 + i * cellH} textAnchor="middle" fontSize="10" fill="#7c2d12" fontFamily={MONO}>
          {it}
        </text>
      ))}
    </g>
  );
}

function Circle({ obj }) {
  const lines = wrapLines(obj.label ?? obj.value ?? "", 14);
  const r = Math.max(24, lines.length * 11 + 10);
  return (
    <g>
      <circle r={r} fill="#eef2ff" stroke="#6366f1" strokeWidth="1.5" />
      {lines.map((ln, i) => (
        <text key={i} y={-((lines.length - 1) * 7) + i * 14} textAnchor="middle" fontSize="11" fill="#3730a3" fontFamily={MONO}>
          {ln}
        </text>
      ))}
    </g>
  );
}

function Plate({ obj }) {
  const lines = wrapLines(obj.label ?? "", 14);
  const maxLen = Math.max(4, ...lines.map((l) => l.length));
  const w = Math.max(60, maxLen * 8 + 24);
  return (
    <g>
      <rect x={-w / 2} y="-17" width={w} height="34" rx="17" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
      {lines.map((ln, i) => (
        <text key={i} y={-((lines.length - 1) * 7) + i * 14 + 4} textAnchor="middle" fontSize="11" fill="#334155" fontFamily={MONO}>
          {ln}
        </text>
      ))}
    </g>
  );
}

function LinkedNode({ obj }) {
  return (
    <g>
      <rect x="-40" y="-22" width="70" height="44" rx="6" fill="#fefce8" stroke="#a16207" strokeWidth="1.5" />
      {wrapLines(obj.value ?? obj.label ?? "", 10).map((ln, i) => (
        <text key={i} y={-3 + i * 13} textAnchor="middle" fontSize="10" fill="#713f12" fontFamily={MONO}>{ln}</text>
      ))}
      <rect x="34" y="-8" width="16" height="16" fill="none" stroke="#a16207" strokeWidth="1.5" />
      <path d="M 40 -2 l 8 -6 M 40 -2 l 8 6" stroke="#a16207" strokeWidth="1" />
    </g>
  );
}

function Bucket({ obj }) {
  const items = Array.isArray(obj.items) ? obj.items : [];
  return (
    <g>
      <path d="M -40 -26 L 40 -26 L 30 26 L -30 26 Z" fill="#f0f9ff" stroke="#38bdf8" strokeWidth="1.5" />
      {items.map((it, i) => (
        <text key={i} y={-14 + i * 15} textAnchor="middle" fontSize="10" fill="#075985" fontFamily={MONO}>
          {String(it).slice(0, 10)}
        </text>
      ))}
    </g>
  );
}

function Cloud() {
  return (
    <path
      d="M -30 14 a 13 13 0 0 1 4 -25 a 17 17 0 0 1 33 -6 a 12 12 0 0 1 19 11 a 9 9 0 0 1 -3 20 z"
      fill="#f0f9ff"
      stroke="#7dd3fc"
      strokeWidth="1.5"
    />
  );
}

function Server() {
  return (
    <g>
      <rect x="-28" y="-46" width="56" height="92" rx="6" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
      {[-28, -10, 8, 26].map((y) => (
        <g key={y}>
          <line x1="-18" y1={y} x2="18" y2={y} stroke="#cbd5e1" strokeWidth="1.5" />
          <circle cx="12" cy={y - 7} r="2.5" fill="#22c55e" />
        </g>
      ))}
    </g>
  );
}

function User() {
  return (
    <g>
      <circle cx="0" cy="-16" r="11" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
      <path d="M -20 22 a 20 20 0 0 1 40 0" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
    </g>
  );
}

function Lock() {
  return (
    <g>
      <path d="M -9 -6 v -6 a 9 9 0 0 1 18 0 v 6" fill="none" stroke="#eab308" strokeWidth="2.5" />
      <rect x="-16" y="-6" width="32" height="26" rx="4" fill="#fef9c3" stroke="#eab308" strokeWidth="1.5" />
      <circle cx="0" cy="7" r="3" fill="#ca8a04" />
    </g>
  );
}

function Key() {
  return (
    <g>
      <circle cx="-16" cy="0" r="8" fill="none" stroke="#94a3b8" strokeWidth="3" />
      <line x1="-8" y1="0" x2="18" y2="0" stroke="#94a3b8" strokeWidth="3" />
      <line x1="12" y1="0" x2="12" y2="8" stroke="#94a3b8" strokeWidth="3" />
      <line x1="18" y1="0" x2="18" y2="8" stroke="#94a3b8" strokeWidth="3" />
    </g>
  );
}

function Gear() {
  return (
    <g>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={Math.cos(a) * 16}
            y1={Math.sin(a) * 16}
            x2={Math.cos(a) * 22}
            y2={Math.sin(a) * 22}
            stroke="#64748b"
            strokeWidth="4"
          />
        );
      })}
      <circle r="16" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
      <circle r="5" fill="none" stroke="#64748b" strokeWidth="1.5" />
    </g>
  );
}

function Flag() {
  return (
    <g>
      <line x1="0" y1="-24" x2="0" y2="24" stroke="#64748b" strokeWidth="2.5" />
      <path d="M 2 -22 l 26 8 l -26 8 z" fill="#ef4444" />
    </g>
  );
}

function Bug() {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="14" ry="18" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
      <circle cx="0" cy="-16" r="5" fill="#ef4444" />
      {[-8, 0, 8].map((d) => (
        <g key={d}>
          <line x1={-14} y1={d} x2={-22} y2={d - 4} stroke="#ef4444" strokeWidth="1.5" />
          <line x1={14} y1={d} x2={22} y2={d - 4} stroke="#ef4444" strokeWidth="1.5" />
        </g>
      ))}
    </g>
  );
}

function Robot() {
  return (
    <g>
      <line x1="0" y1="-16" x2="0" y2="-26" stroke="#0ea5e9" strokeWidth="2" />
      <circle cx="0" cy="-28" r="3" fill="#0ea5e9" />
      <rect x="-22" y="-16" width="44" height="32" rx="8" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="1.5" />
      <circle cx="-8" cy="-4" r="3.5" fill="#0ea5e9" />
      <circle cx="8" cy="-4" r="3.5" fill="#0ea5e9" />
      <line x1="-8" y1="9" x2="8" y2="9" stroke="#0ea5e9" strokeWidth="2" />
    </g>
  );
}

function Packet({ obj }) {
  return (
    <circle r="10" fill={obj.color || "#4f9eff"} stroke="#1e40af" strokeWidth="1.5" />
  );
}

const SHAPES = {
  host: Host,
  packet: Packet,
  firewall: Firewall,
  database: Database,
  router: Router,
  memory_block: MemoryBlock,
  function_box: FunctionBox,
  pointer: Pointer,
  note: Note,
  queue: Queue,
  stack: Stack,
  circle: Circle,
  plate: Plate,
  linked_node: LinkedNode,
  bucket: Bucket,
  cloud: Cloud,
  server: Server,
  user: User,
  lock: Lock,
  key: Key,
  gear: Gear,
  flag: Flag,
  bug: Bug,
  robot: Robot,
  text_label: TextObject,
  code_block: TextObject,
  math_expression: TextObject,
  variable_value: TextObject,
  array_cell: TextObject,
  expression_token: TextObject
};

export function SceneObject({ obj }) {
  const Shape = SHAPES[obj.type] ?? Host;
  const filter = obj.glow === "red" ? "url(#glowRed)" : obj.glow === "green" ? "url(#glowGreen)" : undefined;
  return (
    <g filter={filter}>
      <Shape obj={obj} />
    </g>
  );
}

// Vertical offset (from the node center) for the external label, or null when
// the shape labels itself.
export function labelOffset(obj) {
  if (!obj || !obj.label) return null;
  switch (obj.type) {
    case "pointer":
    case "note":
    case "circle":
    case "plate":
    case "cloud":
      return null;
    case "host":
      return 30 + 18;
    case "firewall":
      return 32 + 18;
    case "database":
      return 32 + 18;
    case "router":
      return 22 + 18;
    case "server":
      return 46 + 18;
    case "user":
      return 22 + 18;
    case "lock":
      return 20 + 18;
    case "key":
      return 10 + 18;
    case "gear":
      return 22 + 18;
    case "flag":
      return 24 + 18;
    case "bug":
      return 20 + 18;
    case "robot":
      return 28 + 18;
    case "packet":
      return 10 + 16;
    case "linked_node":
      return 22 + 18;
    case "bucket":
      return 26 + 18;
    case "text_label":
    case "code_block":
    case "math_expression":
    case "variable_value":
    case "array_cell":
    case "expression_token":
      return null; // text objects label themselves
    case "memory_block": {
      const cells = Array.isArray(obj.cells) ? obj.cells : ["", "", "", ""];
      const rows = Math.max(1, ...cells.map((c) => wrapLines(String(c), 14).length));
      return (rows * 16 + 8) / 2 + 18;
    }
    case "function_box": {
      const params = Array.isArray(obj.params) ? obj.params : [];
      return (24 + params.length * 20 + 8) / 2 + 18;
    }
    case "queue": {
      const items = Array.isArray(obj.items) ? obj.items : [];
      const rows = Math.max(1, ...items.map((i) => wrapLines(String(i), 14).length));
      return (rows * 16 + 8) / 2 + 30;
    }
    case "stack": {
      const items = Array.isArray(obj.items) ? obj.items : [];
      return Math.max(22, items.length * 22) / 2 + 18;
    }
    default:
      return 58;
  }
}