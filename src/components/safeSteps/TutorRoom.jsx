import React from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import TutorCharacter from "./TutorCharacter";

const STATE_LABELS = { thinking: "Thinking", speaking: "Speaking", idle: null, listening: null };

export default function TutorRoom({ roomState, lines, voiceNotice, onMicPress }) {
  const label = STATE_LABELS[roomState] ?? null;
  return (
    <div
      className={`mb-5 rounded-2xl border border-slate-200 bg-white p-4 ${
        roomState === "thinking" ? "ss-thinking" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <TutorCharacter state={roomState} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {label && <span className="ss-state-chip">{label}</span>}
            <Button variant="outline" size="sm" onClick={onMicPress}>
              <Mic className="mr-1 h-4 w-4" />
              Talk to the tutor
            </Button>
          </div>
          <div aria-live="polite" className="space-y-1">
            {lines.map((l, i) => (
              <p key={i} className="text-base leading-relaxed text-slate-700">
                {l}
              </p>
            ))}
          </div>
          {voiceNotice && <p className="text-sm text-slate-500">{voiceNotice}</p>}
        </div>
      </div>
    </div>
  );
}