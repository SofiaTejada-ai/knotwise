import React from "react";
import * as L from "@/lib/safeStepsLogic";
import { Check } from "lucide-react";

export default function StepSidebar({ state, onGo }) {
  return (
    <nav aria-label="Lesson steps" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0 lg:content-start">
      {L.STEPS.map((s) => {
        const done = state.completed.includes(s.num);
        const current = state.step === s.num;
        return (
          <button
            key={s.num}
            onClick={() => onGo(s.num)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm whitespace-nowrap lg:whitespace-normal ${
              current
                ? "border-[color:var(--ss-accent)] bg-[color:var(--ss-accent-soft)] font-medium text-slate-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                done ? "bg-[color:var(--ss-found-bg)] text-[color:var(--ss-found)]" : "bg-slate-100 text-slate-600"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : s.num}
            </span>
            {s.title}
          </button>
        );
      })}
    </nav>
  );
}