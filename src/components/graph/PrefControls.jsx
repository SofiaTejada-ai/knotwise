import React from "react";
import { Eye, Pause, Type } from "lucide-react";

const btn = "flex h-11 items-center gap-2 rounded-lg border px-3 font-semibold";
const on = "border-[#1F7A7A] bg-[#E3F1F1] text-[#1F7A7A]";
const off = "border-[#B9B2A3] bg-white text-[#1B2A49] hover:bg-[#F6F2EA]";

// Focus, Reduce Motion and Text Size buttons (Focus is only shown in the top bar).
export default function PrefControls({ prefs, showFocus }) {
  return (
    <div className="flex flex-wrap gap-2">
      {showFocus && (
        <button type="button" aria-pressed={prefs.focus} onClick={prefs.toggleFocus} className={`${btn} ${prefs.focus ? on : off}`}>
          <Eye className="h-4 w-4" /> Focus
        </button>
      )}
      <button
        type="button"
        aria-pressed={prefs.reduceMotion}
        onClick={prefs.toggleReduceMotion}
        title={prefs.systemReduce ? "Your device already asks for reduced motion" : undefined}
        className={`${btn} ${prefs.reduceMotion ? on : off}`}
      >
        <Pause className="h-4 w-4" /> Reduce Motion
      </button>
      <button type="button" onClick={prefs.cycleTextSize} aria-label={`Text size, now ${prefs.textSize} pixels. Press to change.`} className={`${btn} ${off}`}>
        <Type className="h-4 w-4" /> Text Size
      </button>
    </div>
  );
}