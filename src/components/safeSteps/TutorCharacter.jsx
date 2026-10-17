import React from "react";
import { Bot } from "lucide-react";

export default function TutorCharacter({ state }) {
  const active = state === "speaking" || state === "thinking";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        aria-label="Tutor character"
        className={`ss-character flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-[color:var(--ss-accent-soft)] ${
          active ? "border-[color:var(--ss-accent)]" : "border-[color:var(--ss-accent-border)]"
        }`}
      >
        <Bot className="h-6 w-6 text-[color:var(--ss-accent)]" />
      </div>
      <span className="text-xs text-slate-500">Tutor</span>
    </div>
  );
}