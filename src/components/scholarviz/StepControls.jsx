import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

export default function StepControls({ total, current, disabled, onPrev, onReplay, onGoTo, onNext }) {
  if (!total) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button variant="outline" size="sm" disabled={disabled || current <= 0} onClick={onPrev}>
        <ChevronLeft className="mr-1 h-4 w-4" />
        Prev
      </Button>
      <Button variant="outline" size="sm" disabled={disabled} onClick={onReplay}>
        <RotateCcw className="mr-1 h-4 w-4" />
        Replay step
      </Button>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          let cls = "h-2 w-2 rounded-full bg-slate-300 transition-transform";
          if (i < current) cls = "h-2 w-2 rounded-full bg-emerald-400";
          if (i === current) cls = "h-3 w-3 rounded-full bg-blue-600 shadow-[0_0_6px_2px_rgba(37,99,235,0.6)]";
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              className={cls}
              onClick={() => onGoTo(i)}
            />
          );
        })}
      </div>
      <Button size="sm" disabled={disabled || current >= total - 1} onClick={onNext}>
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}