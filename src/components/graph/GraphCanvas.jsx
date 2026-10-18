import React from "react";
import { evaluate, makeTicks, formatNumber, equationText } from "@/lib/functionRules";

const W = 640;
const H = 420;
const M = { l: 48, r: 20, t: 20, b: 36 };
const SAMPLES = 240;

// The SVG teaching canvas: grid, axes, the live curve, and the prediction points.
export default function GraphCanvas({ lesson, params, prediction }) {
  const { xMin, xMax, yMin, yMax, tickX, tickY } = lesson.view;
  const sx = (x) => M.l + ((x - xMin) / (xMax - xMin)) * (W - M.l - M.r);
  const sy = (y) => H - M.b - ((y - yMin) / (yMax - yMin)) * (H - M.t - M.b);
  const span = yMax - yMin;
  const clampY = (y) => Math.max(yMin - span, Math.min(yMax + span, y));

  const pathFor = (p) => {
    let d = "";
    for (let i = 0; i <= SAMPLES; i++) {
      const x = xMin + ((xMax - xMin) * i) / SAMPLES;
      const y = evaluate(lesson.formula, p, x);
      if (!Number.isFinite(y)) continue;
      d += `${d ? "L" : "M"}${sx(x).toFixed(1)},${sy(clampY(y)).toFixed(1)}`;
    }
    return d;
  };

  const inView = (y) => y >= yMin && y <= yMax;
  const nowY = prediction ? evaluate(lesson.formula, params, prediction.x) : null;
  const label = { fontSize: 14, fill: "#5B6478" };
  const halo = { stroke: "#FAF7F2", strokeWidth: 4, paintOrder: "stroke" };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full rounded-2xl border border-[#E4DED2] bg-white"
      role="img"
      aria-label={`Graph of ${equationText(lesson.formula, params)}`}
    >
      <clipPath id="plotArea">
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} />
      </clipPath>

      {makeTicks(xMin, xMax, tickX).map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} stroke="#EFEAE0" />
          <text x={sx(t)} y={H - M.b + 20} textAnchor="middle" {...label}>{t}</text>
        </g>
      ))}
      {makeTicks(yMin, yMax, tickY).map((t) => (
        <g key={`y${t}`}>
          <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke="#EFEAE0" />
          <text x={M.l - 8} y={sy(t) + 5} textAnchor="end" {...label}>{t}</text>
        </g>
      ))}
      <line x1={M.l} x2={W - M.r} y1={sy(0)} y2={sy(0)} stroke="#5B6478" strokeWidth="1.5" />
      <line x1={sx(0)} x2={sx(0)} y1={M.t} y2={H - M.b} stroke="#5B6478" strokeWidth="1.5" />

      <g clipPath="url(#plotArea)">
        {prediction && (
          <path d={pathFor(lesson.defaults)} fill="none" stroke="#5B6478" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
        )}
        <path d={pathFor(params)} fill="none" stroke="#2E8B8B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <text x={M.l + 10} y={M.t + 22} fontSize="17" fontWeight="600" fill="#1B2A49" {...halo}>
        {equationText(lesson.formula, params)}
      </text>

      {prediction && inView(prediction.guess) && inView(prediction.actual) && (
        <line x1={sx(prediction.x)} x2={sx(prediction.x)} y1={sy(prediction.guess)} y2={sy(prediction.actual)} stroke="#1B2A49" strokeDasharray="4 4" strokeWidth="2" />
      )}
      {prediction && inView(prediction.guess) && (
        <g>
          <rect x={sx(prediction.x) - 7} y={sy(prediction.guess) - 7} width="14" height="14" fill="#fff" stroke="#1B2A49" strokeWidth="3" />
          <text x={sx(prediction.x) + 14} y={sy(prediction.guess) + 5} fontSize="14" fill="#1B2A49" {...halo}>your guess</text>
        </g>
      )}
      {prediction && inView(prediction.actual) && (
        <g>
          <circle cx={sx(prediction.x)} cy={sy(prediction.actual)} r="9" fill="#1F7A7A" stroke="#fff" strokeWidth="3" />
          <text x={sx(prediction.x) + 14} y={sy(prediction.actual) + 5} fontSize="14" fontWeight="600" fill="#1F7A7A" {...halo}>
            actual {formatNumber(prediction.actual)}
          </text>
        </g>
      )}
      {prediction && Number.isFinite(nowY) && inView(nowY) && (
        <circle cx={sx(prediction.x)} cy={sy(nowY)} r="6" fill="#2E8B8B" stroke="#1B2A49" strokeWidth="2" />
      )}
    </svg>
  );
}