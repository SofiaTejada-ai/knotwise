import React from "react";
import { Check } from "lucide-react";

// The planned sequence of topics the tutor chose for this lesson, with the
// student's live progress through it.
export default function LessonPlan({ map, activeNodeId, doneNodes = [] }) {
  const nodes = map?.nodes ?? [];
  if (!nodes.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">
        Lesson plan · {nodes.length} {nodes.length === 1 ? "topic" : "topics"} your tutor chose
      </p>
      <ol className="mt-2 space-y-1">
        {nodes.map((n, i) => {
          const done = doneNodes.includes(n.id);
          const current = n.id === activeNodeId;
          return (
            <li
              key={n.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                current ? "bg-blue-50 font-medium text-blue-700" : done ? "text-slate-400" : "text-slate-600"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                  done
                    ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                    : current
                      ? "border-blue-400 bg-blue-100 text-blue-700"
                      : "border-slate-200 text-slate-400"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="truncate">{n.label}</span>
              {current && <span className="ml-auto text-[10px] uppercase tracking-wide text-blue-500">now</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}