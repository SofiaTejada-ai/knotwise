import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { SceneObject, labelOffset, wrapLines, MONO } from "./SceneObjects";

const SPEED = 2.5; // global slowdown so every step is readable
const NS = "http://www.w3.org/2000/svg";

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
  return e;
}

function addStepToTimeline(tl, step, layer, scene, onUpdateObject) {
  const dur = Math.max(0.3, Math.min(3, Number(step.duration) || 1)) * SPEED;
  const color = step.color || "#4f9eff";
  const pos = (id) => {
    const o = (scene.objects ?? []).find((x) => x.id === id);
    return o ? { x: o.x, y: o.y } : null;
  };
  switch (step.action) {
    case "emit_packet":
    case "retransmit": {
      const a = pos(step.from);
      const b = pos(step.to);
      if (!a || !b) return;
      const dash = step.action === "retransmit" ? "2 6" : "6 4";
      const line = el("line", {
        x1: a.x, y1: a.y, x2: a.x, y2: a.y,
        stroke: color, "stroke-width": 2, "stroke-dasharray": dash, opacity: 0.85
      });
      layer.appendChild(line);
      tl.fromTo(line, { attr: { x2: a.x, y2: a.y } }, { attr: { x2: b.x, y2: b.y }, duration: dur * 0.6, ease: "none" });
      const g = el("g");
      g.appendChild(el("circle", { cx: 0, cy: 0, r: 9, fill: color, filter: "url(#packetGlow)" }));
      if (step.label) {
        const t = el("text", { y: -14, "text-anchor": "middle", "font-size": 11, "font-family": MONO, fill: "#0f172a" });
        t.textContent = step.label;
        g.appendChild(t);
      }
      layer.appendChild(g);
      tl.set(g, { x: a.x, y: a.y });
      tl.to(g, { x: b.x, y: b.y, duration: dur * 0.35, ease: "power1.inOut" });
      tl.to(g, { opacity: 0, duration: 0.25 });
      break;
    }
    case "pulse": {
      const p = pos(step.target);
      const node = p && document.getElementById(`pulse-${step.target}`);
      if (!p || !node) return;
      tl.set(node, { attr: { filter: step.color ? "url(#pulseGlow)" : "url(#pulseGlow)" } });
      tl.to(node, { scale: 1.35, svgOrigin: `${p.x} ${p.y}`, duration: dur * 0.35, ease: "power2.out" });
      tl.to(node, { scale: 1, svgOrigin: `${p.x} ${p.y}`, duration: dur * 0.35, ease: "power2.in" });
      tl.set(node, { attr: { filter: "" } });
      break;
    }
    case "annotate": {
      const p = pos(step.target);
      if (!p) return;
      const words = String(step.text ?? "").split(/\s+/).filter(Boolean);
      const lines = [];
      let cur = [];
      for (const w of words) {
        cur.push(w);
        if (cur.length === 3) {
          lines.push(cur.join(" "));
          cur = [];
        }
      }
      if (cur.length) lines.push(cur.join(" "));
      if (!lines.length) return;
      const g = el("g", { opacity: 0 });
      const t = el("text", {
        x: p.x, y: p.y - 34 - lines.length * 13,
        "text-anchor": "middle", "font-size": 11, "font-family": MONO,
        fill: step.color || "#0f172a"
      });
      lines.forEach((ln, i) => {
        const ts = el("tspan", { x: p.x, dy: i === 0 ? 0 : 14 });
        ts.textContent = ln;
        t.appendChild(ts);
      });
      g.appendChild(t);
      layer.appendChild(g);
      tl.to(g, { opacity: 1, duration: dur * 0.3 });
      break;
    }
    case "highlight_path": {
      const a = pos(step.from) || pos(step.target);
      const b = pos(step.to) || pos(step.target);
      if (!a || !b) return;
      const line = el("line", {
        x1: a.x, y1: a.y, x2: a.x, y2: a.y,
        stroke: color, "stroke-width": 3, opacity: 0.9, filter: "url(#packetGlow)"
      });
      layer.appendChild(line);
      tl.fromTo(line, { attr: { x2: a.x, y2: a.y } }, { attr: { x2: b.x, y2: b.y }, duration: dur * 0.6, ease: "none" });
      tl.to(line, { opacity: 0.3, duration: dur * 0.3 });
      break;
    }
    case "timeout": {
      const p = pos(step.target);
      if (!p) return;
      const g = el("g", { opacity: 0 });
      const ring = el("circle", {
        cx: p.x, cy: p.y, r: 34, fill: "none",
        stroke: step.color || "#f59e0b", "stroke-width": 2.5, "stroke-dasharray": "5 6"
      });
      g.appendChild(ring);
      if (step.label) {
        const t = el("text", {
          x: p.x, y: p.y - 42, "text-anchor": "middle",
          "font-size": 11, "font-family": MONO, fill: step.color || "#b45309"
        });
        t.textContent = step.label;
        g.appendChild(t);
      }
      layer.appendChild(g);
      tl.to(g, { opacity: 1, duration: 0.25 });
      tl.fromTo(
        ring,
        { rotation: 0, svgOrigin: `${p.x} ${p.y}` },
        { rotation: 360, svgOrigin: `${p.x} ${p.y}`, duration: dur * 0.6, ease: "none" }
      );
      tl.to(g, { opacity: 0.55, duration: 0.2 });
      break;
    }
    case "clear": {
      const children = Array.from(layer.children);
      if (!children.length) return;
      tl.to(children, {
        opacity: 0,
        duration: dur * 0.3,
        onComplete: () => {
          while (layer.firstChild) layer.removeChild(layer.firstChild);
        }
      });
      break;
    }
    case "update_object": {
      tl.call(() => onUpdateObject(step.target, step.props ?? {}));
      tl.to({}, { duration: dur * 0.25 });
      break;
    }
    default:
      break;
  }
}

export default function AnimationCanvas({
  scene,
  startStep,
  playToken,
  playMode,
  onStepComplete,
  onAnimatingChange,
  onMoveNode,
  onUpdateObject
}) {
  const svgRef = useRef(null);
  const animRef = useRef(null);
  const objectsRef = useRef(null);
  const tlRef = useRef(null);
  const dragRef = useRef(null);
  const prevSceneId = useRef(null);

  const cbRef = useRef({});
  cbRef.current = { onStepComplete, onAnimatingChange, onMoveNode, onUpdateObject };

  // Rebuild the GSAP timeline whenever playback is requested.
  useEffect(() => {
    const layer = animRef.current;
    if (!layer) return undefined;
    if (tlRef.current) {
      tlRef.current.kill();
      tlRef.current = null;
    }
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    if (!scene || !Array.isArray(scene.sequence) || scene.sequence.length === 0) return undefined;
    const steps = scene.sequence;
    const from = Math.max(0, Math.min(startStep, steps.length - 1));
    const played = playMode === "single" ? [steps[from]] : steps.slice(from);
    const tl = gsap.timeline({
      onStart: () => cbRef.current.onAnimatingChange?.(true),
      onComplete: () => cbRef.current.onAnimatingChange?.(false)
    });
    tlRef.current = tl;
    for (const step of played) {
      tl.call(() => cbRef.current.onStepComplete?.(step.step - 1), [], tl.duration());
      addStepToTimeline(tl, step, layer, scene, (id, props) => cbRef.current.onUpdateObject?.(id, props));
    }
    return () => {
      tl.kill();
    };
  }, [playToken]);

  // Camera materialize for a brand new scene.
  useEffect(() => {
    if (!scene || !objectsRef.current) return;
    if (prevSceneId.current !== scene.scene_id) {
      prevSceneId.current = scene.scene_id;
      gsap.fromTo(
        objectsRef.current,
        { opacity: 0, scale: 0.93, svgOrigin: "450 275" },
        { opacity: 1, scale: 1, svgOrigin: "450 275", duration: 0.6, ease: "power2.out", overwrite: "auto" }
      );
    }
  }, [scene?.scene_id]);

  // Page-level move and up tracking: the drag keeps working even when the
  // pointer leaves the canvas, and it does not depend on pointer capture.
  const handleDragMove = (ev) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = Math.max(40, Math.min(860, d.sx + (ev.clientX - d.cx) * d.scale));
    const ny = Math.max(40, Math.min(510, d.sy + (ev.clientY - d.cy) * d.scale));
    d.moved = true;
    d.x = Math.round(nx);
    d.y = Math.round(ny);
    d.el?.setAttribute("transform", `translate(${nx},${ny})`);
  };

  const endDrag = () => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    document.removeEventListener("pointermove", handleDragMove);
    document.removeEventListener("pointerup", endDrag);
    document.removeEventListener("pointercancel", endDrag);
    if (d.moved && d.x != null) cbRef.current.onMoveNode?.(d.id, d.x, d.y);
  };

  const beginDrag = (e, obj) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    dragRef.current = {
      id: obj.id,
      sx: obj.x,
      sy: obj.y,
      cx: e.clientX,
      cy: e.clientY,
      scale: 900 / rect.width,
      moved: false,
      el: e.currentTarget.closest("g[data-node]")
    };
    document.addEventListener("pointermove", handleDragMove);
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
    e.stopPropagation();
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 900 550"
      className="h-full w-full touch-none select-none"
      role="img"
      aria-label="Animation canvas"
    >
      <defs>
        <pattern id="grid50" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" />
        </pattern>
        <filter id="packetGlow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="pulseGlow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowRed" x="-70%" y="-70%" width="240%" height="240%">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#ef4444" />
        </filter>
        <filter id="glowGreen" x="-70%" y="-70%" width="240%" height="240%">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#22c55e" />
        </filter>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
        <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.25" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="900" height="550" fill="#f8fafc" />
      <rect x="0" y="0" width="900" height="550" fill="url(#grid50)" />

      <g ref={objectsRef}>
        {(scene?.objects ?? []).map((obj) => {
          const off = labelOffset(obj);
          const lines = off ? wrapLines(obj.label, 18) : [];
          return (
            <g key={obj.id} data-node="1" transform={`translate(${obj.x},${obj.y})`}>
              <g id={`pulse-${obj.id}`} style={{ cursor: "grab" }} onPointerDown={(e) => beginDrag(e, obj)}>
                <SceneObject obj={obj} />
              </g>
              {off && (
                <text textAnchor="middle" fontSize="12" fill="#475569" fontFamily="Inter, sans-serif">
                  {lines.map((ln, i) => (
                    <tspan key={i} x="0" dy={i === 0 ? off : 14}>
                      {ln}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}
      </g>

      <g ref={animRef} />

      <rect x="0" y="0" width="900" height="550" fill="url(#vignette)" pointerEvents="none" />

      {!scene && (
        <text x="450" y="275" textAnchor="middle" fontSize="16" fill="#94a3b8" fontFamily="Inter, sans-serif">
          Ask a question to see an animation.
        </text>
      )}
    </svg>
  );
}