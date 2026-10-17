import React, { useEffect, useRef, useState } from "react";
import * as L from "@/lib/safeStepsLogic";
import MessageBubble from "./MessageBubble";

const toPath = (points) => points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");

export default function DrawingBoard({ calm, foundIds, hintedIds, onResults, boardEmpty }) {
  const containerRef = useRef(null);
  const strokesRef = useRef([]);
  const currentRef = useRef(null);
  const timerRef = useRef(null);
  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);

  // Clear all strokes when the board is empty again (reset or "Not yet, practice more").
  useEffect(() => {
    if (boardEmpty) {
      clearTimeout(timerRef.current);
      strokesRef.current = [];
      currentRef.current = null;
      rerender();
    }
  }, [boardEmpty]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const rel = (e) => {
    const r = containerRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const check = () => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const targets = Array.from(container.querySelectorAll("[data-target]")).map((el) => ({
      id: el.dataset.target,
      rects: Array.from(el.getClientRects()).map((r) => ({
        x: r.left - cRect.left,
        y: r.top - cRect.top,
        w: r.width,
        h: r.height,
      })),
    }));
    const messageBox = { x: 0, y: 0, w: cRect.width, h: cRect.height };
    const pending = strokesRef.current.filter((s) => !s.result);
    if (pending.length === 0) return;
    const results = pending.map((s) => {
      const r = L.checkStroke(s.points, targets, messageBox);
      s.result = r.kind;
      return r;
    });
    onResults(results);
    if (calm) {
      strokesRef.current = strokesRef.current.filter((s) => !s.result || s.result === "hit");
    } else {
      strokesRef.current
        .filter((s) => s.result && s.result !== "hit")
        .forEach((s) => {
          setTimeout(() => {
            strokesRef.current = strokesRef.current.filter((x) => x !== s);
            rerender();
          }, 1000);
        });
    }
    rerender();
  };

  const onDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    clearTimeout(timerRef.current);
    currentRef.current = { points: [rel(e)] };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // pointer capture is best effort
    }
    rerender();
  };

  const onMove = (e) => {
    const s = currentRef.current;
    if (!s) return;
    e.preventDefault();
    s.points.push(rel(e));
    rerender();
  };

  const onUp = () => {
    const s = currentRef.current;
    if (!s) return;
    currentRef.current = null;
    if (s.points.length >= 2) strokesRef.current.push(s);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(check, 1500);
    rerender();
  };

  const strokes = [...strokesRef.current, ...(currentRef.current ? [currentRef.current] : [])];
  return (
    <div ref={containerRef} className="relative inline-block max-w-full" style={{ touchAction: "none" }}>
      <MessageBubble foundIds={foundIds} hintedIds={hintedIds} />
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        {strokes.map((s, i) => (
          <path
            key={i}
            d={toPath(s.points)}
            className={`ss-stroke ${s.result ? (s.result === "hit" ? "hit" : "miss") : "active"}`}
          />
        ))}
      </svg>
      <div
        className="absolute inset-0"
        style={{ touchAction: "none", cursor: "crosshair" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
      />
    </div>
  );
}