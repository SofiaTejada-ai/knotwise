import React, { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

// The bullet point summary. Students tick off each point as they understand it.
export default function SummaryBullets({ bullets }) {
  const [done, setDone] = useState([]);
  if (!bullets?.length) return null;

  const toggle = (i) => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6" data-testid="bullet-summary">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-800">Summary in bullet points</h2>
        <span className="text-xs text-slate-400">
          {done.length} of {bullets.length} understood
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {bullets.map((b, i) => {
          const checked = done.includes(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  checked
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                {checked ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                )}
                {b}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}