import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;
const ensureInit = () => {
  if (!initialized) {
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "neutral" });
    initialized = true;
  }
};

const nodeIdOf = (el) => (/-flowchart-(n\d+)-\d+$/.exec(el?.id ?? "") || [])[1];

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
    wrapRef.current.querySelectorAll(".node").forEach((el) => {
      el.style.opacity = !selectedId || nodeIdOf(el) === selectedId ? "1" : "0.5";
    });
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
          el.style.opacity = !selectedRef.current || nodeIdOf(el) === selectedRef.current ? "1" : "0.5";
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
    <div onClick={handleClick} className="overflow-x-auto" data-testid="research-diagram">
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