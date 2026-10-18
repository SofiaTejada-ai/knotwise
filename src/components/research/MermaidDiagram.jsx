import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;
const ensureInit = () => {
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      themeVariables: { fontFamily: "JetBrains Mono, ui-monospace, monospace", fontSize: "14px" }
    });
    initialized = true;
  }
};

const nodeIdOf = (el) => (/-flowchart-(n\d+)-\d+$/.exec(el?.id ?? "") || [])[1];

// The chosen node glows; the others soften so the student sees where they are.
function styleNode(el, selectedId) {
  const picked = selectedId && nodeIdOf(el) === selectedId;
  el.style.opacity = !selectedId || picked ? "1" : "0.55";
  el.style.filter = picked ? "drop-shadow(0 0 8px rgba(79,70,229,0.7))" : "";
}

// The clickable lesson diagram. Mermaid draws the chart; tapping any node
// opens its explanation below. The selected node stays bright while the
// others fade, so the student always sees where they are.
export default function MermaidDiagram({ chart, selectedId, onSelect }) {
  const wrapRef = useRef(null);
  const selectedRef = useRef(selectedId);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    selectedRef.current = selectedId;
    if (!wrapRef.current) return;
    wrapRef.current.querySelectorAll(".node").forEach((el) => styleNode(el, selectedId));
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      ensureInit();
      setFailed(false);
      try {
        const { svg } = await mermaid.render(`research-diagram-${Date.now()}`, chart);
        if (cancelled || !wrapRef.current) return;
        wrapRef.current.innerHTML = svg;
        wrapRef.current.querySelectorAll(".node").forEach((el) => {
          el.style.cursor = "pointer";
          el.style.transition = "opacity 0.2s, filter 0.2s";
          styleNode(el, selectedRef.current);
        });
      } catch (err) {
        if (!cancelled) setFailed(true);
      }
    };
    if (chart) run();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  const handleClick = (e) => {
    const nodeEl = e.target?.closest?.(".node");
    const id = nodeIdOf(nodeEl);
    if (id) onSelect?.(id);
  };

  return (
    <div
      onClick={handleClick}
      className="overflow-x-auto [&_.node:hover]:!opacity-100 [&_.node:hover]:brightness-95"
      data-testid="research-diagram"
    >
      {failed ? (
        <p className="py-8 text-center text-sm text-red-500">
          The diagram could not be drawn. Try opening this lesson again.
        </p>
      ) : (
        <div ref={wrapRef} className="flex min-h-[220px] justify-center [&>svg]:h-auto [&>svg]:max-w-full" />
      )}
    </div>
  );
}