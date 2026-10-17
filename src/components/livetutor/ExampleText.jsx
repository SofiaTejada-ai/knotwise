import React, { useState } from "react";

// The node's example sentence. The student taps words to circle them, an
// easy way to point at the part they want to talk about.
export default function ExampleText({ example, reducedMotion = false }) {
  const words = String(example ?? "").split(/\s+/).filter(Boolean);
  const [circled, setCircled] = useState(() => new Set());

  const toggle = (i) => {
    setCircled((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (!words.length) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-400">Example. Tap any word to circle it for your tutor.</p>
      <p className="flex flex-wrap gap-x-1 gap-y-2 text-sm leading-relaxed text-slate-700">
        {words.map((w, i) => {
          const on = circled.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`rounded-full px-1 font-mono ${
                on
                  ? `${reducedMotion ? "" : "transition-colors"} border-2 border-blue-400 text-blue-700`
                  : "border-2 border-transparent hover:border-slate-300"
              }`}
            >
              {w}
            </button>
          );
        })}
      </p>
    </div>
  );
}