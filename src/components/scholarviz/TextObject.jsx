import React from "react";
import { TEXT_STYLES, layoutLines, highlightRanges, codePieces } from "@/lib/textLayout";

const MONO = "JetBrains Mono, ui-monospace, monospace";

// Native text object: code, SQL, equations, values and tokens drawn as real
// SVG text (exact characters, selectable, sharp at any camera zoom).
export default function TextObject({ obj }) {
  const st = TEXT_STYLES[obj.type] ?? TEXT_STYLES.text_label;
  const cw = st.fs * 0.6;
  const lh = st.fs * 1.45;
  const lines = layoutLines(obj.text, st.cols);
  const cols = Math.max(1, ...lines.map((l) => l.length));
  const w = Math.max(st.fs * 1.8, cols * cw + st.pad * 2);
  const h = lines.length * lh + st.pad * 2;
  const x0 = -w / 2 + st.pad;
  const y0 = -h / 2 + st.pad;
  const dark = obj.type === "code_block";
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={obj.type === "array_cell" ? 4 : 8} fill={st.bg} stroke={st.border} strokeWidth="2" />
      {lines.map((ln, r) =>
        highlightRanges(ln, obj.highlight).map(([a, b], k) => (
          <g key={`h${r}-${k}`}>
            <rect x={x0 + a * cw - 2} y={y0 + r * lh} width={(b - a) * cw + 4} height={lh} rx="3" fill="#f59e0b" opacity={dark ? 0.45 : 0.3} />
            <rect x={x0 + a * cw - 2} y={y0 + (r + 1) * lh - 3} width={(b - a) * cw + 4} height="3" fill="#f59e0b" />
          </g>
        ))
      )}
      <text fontFamily={MONO} fontSize={st.fs} fill={st.fg} xmlSpace="preserve" style={{ whiteSpace: "pre", userSelect: "text" }}>
        {lines.map((ln, r) => (
          <tspan key={r} x={x0} y={y0 + r * lh + st.fs * 1.08}>
            {dark ? codePieces(ln, st.fg).map((p, k) => <tspan key={k} fill={p.c}>{p.t}</tspan>) : ln}
          </tspan>
        ))}
      </text>
      {obj.label && (
        <text y={h / 2 + 16} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily={MONO}>
          {obj.label}
        </text>
      )}
    </g>
  );
}