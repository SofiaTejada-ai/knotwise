import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Map as MapIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pickShapes, getShape } from "@/components/livetutor/NodeShapes";
import NodeShapeArt from "@/components/livetutor/NodeShapes";

const SVG_W = 1000;
const SVG_H = 440;
const NODE_W = 160;
const NODE_H = 120;

// Wrap a label to lines of at most 18 characters (readability on the map).
function wrapLabel(text, maxChars = 18) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((w) => {
    if (!current) current = w;
    else if ((current + " " + w).length <= maxChars) current += " " + w;
    else {
      lines.push(current);
      current = w;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

// Stable layout: nodes never move; only the camera (viewBox) travels.
function layout(nodes) {
  const n = Math.max(nodes.length, 1);
  const step = nodes.length > 1 ? 800 / (n - 1) : 0;
  return nodes.map((node, i) => ({
    id: node.id,
    x: nodes.length > 1 ? 100 + i * step : 500,
    y: i % 2 === 0 ? 150 : 292
  }));
}

export default function KnowledgeMapCanvas({ map, activeNodeId, doneNodes = [], reducedMotion = false }) {
  const [viewedId, setViewedId] = useState(activeNodeId ?? null);
  const svgRef = useRef(null);
  const viewRef = useRef({ x: 0, y: 0, w: SVG_W, h: SVG_H });

  const nodes = map?.nodes ?? [];
  const positions = useMemo(() => layout(nodes), [nodes]);
  const posById = useMemo(() => {
    const m = {};
    positions.forEach((p) => (m[p.id] = p));
    return m;
  }, [positions]);
  const shapeById = useMemo(() => pickShapes(nodes, map?.title ?? ""), [nodes, map?.title]);

  const applyView = () => {
    const el = svgRef.current;
    const v = viewRef.current;
    if (el) el.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
  };

  // The camera follows the node the tutor is teaching.
  useEffect(() => {
    setViewedId(activeNodeId ?? null);
  }, [activeNodeId]);

  useEffect(() => {
    let target;
    const pos = viewedId ? posById[viewedId] : null;
    if (pos) {
      const w = 430;
      const h = (w * SVG_H) / SVG_W;
      target = { x: pos.x - w / 2, y: pos.y - h / 2, w, h };
    } else {
      target = { x: 0, y: 0, w: SVG_W, h: SVG_H };
    }
    if (reducedMotion) {
      Object.assign(viewRef.current, target);
      applyView();
      return;
    }
    const tween = gsap.to(viewRef.current, {
      ...target,
      duration: 0.9,
      ease: "power2.inOut",
      onUpdate: applyView
    });
    return () => tween.kill();
  }, [viewedId, positions, posById, reducedMotion]);

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full bg-white"
      >
        {(map?.edges ?? []).map((e, i) => {
          const a = posById[e.from];
          const b = posById[e.to];
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={`edge-${i}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-slate-300" strokeWidth={2} />
              {e.label && (
                <text
                  x={mx}
                  y={my - 6}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-slate-500 font-mono"
                  stroke="white"
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  {e.label.slice(0, 20)}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((node) => {
          const pos = posById[node.id];
          const shape = getShape(shapeById[node.id]);
          const isActive = node.id === activeNodeId;
          const isDone = doneNodes.includes(node.id);
          const labelLines = wrapLabel(node.label);
          const index = nodes.findIndex((n) => n.id === node.id) + 1;
          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => setViewedId(node.id)}
              transform={`translate(${pos.x}, ${pos.y})`}
            >
              {isActive && (
                <g>
                  {/* soft color halo behind the silhouette */}
                  <ellipse cx="0" cy="-14" rx="40" ry="36" fill={shape.color} opacity={0.1} />
                  {/* dashed selection ring around the artwork */}
                  <ellipse
                    cx="0"
                    cy="-14"
                    rx="48"
                    ry="42"
                    fill="none"
                    stroke={shape.color}
                    strokeWidth={2.5}
                    strokeDasharray="7 5"
                    className={reducedMotion ? undefined : "ss-node-focus"}
                  />
                </g>
              )}
              {/* silhouette artwork, drawn centered above the label */}
              <g transform="translate(0, -14)">
                <NodeShapeArt shapeId={shape.id} active={isActive} />
              </g>
              {/* order badge */}
              <circle cx="-36" cy="-42" r="10" fill={shape.color} />
              <text x="-36" y="-38" textAnchor="middle" fontSize={11} fontWeight="700" className="fill-white font-mono">
                {index}
              </text>
              {/* completed badge */}
              {isDone && (
                <g>
                  <circle cx="38" cy="-42" r="11" className="fill-emerald-500" />
                  <Check x={34} y={-46} width={8} height={8} className="stroke-white" strokeWidth={3} />
                </g>
              )}
              {/* label beside the artwork, wrapped for readability */}
              {labelLines.map((line, li) => (
                <text
                  key={li}
                  x={0}
                  y={38 + li * 15}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={isActive ? 700 : 400}
                  className={isActive ? "fill-slate-900 font-mono" : "fill-slate-600 font-mono"}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>

      <div className="absolute left-3 top-3 max-w-[45%] truncate rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
        {map?.title ?? "Learning map"}
      </div>
      <div className="absolute right-3 top-3 flex gap-2">
        {viewedId && viewedId !== activeNodeId && (
          <Button size="sm" variant="outline" onClick={() => setViewedId(activeNodeId)}>
            Back to current node
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setViewedId(null)}>
          <MapIcon className="h-4 w-4" />
          Full map
        </Button>
      </div>
    </div>
  );
}