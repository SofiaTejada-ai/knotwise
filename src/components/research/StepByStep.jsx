import React, { useState } from "react";
import { Check } from "lucide-react";

// Step by step walk through at the bottom of the lesson. Tap a step to open
// it; mark it done to move on.
export default function StepByStep({ steps }) {
  const [open, setOpen] = useState(0);
  const [done, setDone] = useState([]);
  if (!steps?.length) return null;

  const finish = (i) => {
    setDone((d) => (d.includes(i) ? d : [...d, i]));
    setOpen(i + 1 < steps.length ? i + 1 : i);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6" data-testid="step-by-step">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-800">Step by step</h2>
        <span className="text-xs text-slate-400">
          {done.length} of {steps.length} done
        </span>
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => {
          const isDone = done.includes(i);
          const isOpen = open === i;
          return (
            <li key={i} className="flex gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isDone ? "bg-emerald-500 text-white" : isOpen ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} className="text-left font-medium text-slate-800">
                  {s.title}
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-2">
                    <p className="text-sm leading-relaxed text-slate-600">{s.detail}</p>
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => finish(i)}
                        className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        Mark step done
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}