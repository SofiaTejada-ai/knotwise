import React from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

// Pause screen: the microphone is released and the tutor waits. Nothing is
// lost; resuming reconnects the voice tutor to the same place in the lesson.
export default function PauseOverlay({ onResume, onEnd }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
          <Pause className="h-6 w-6 text-blue-500" />
        </div>
        <p className="text-lg font-semibold text-slate-800">Lesson paused</p>
        <p className="text-sm text-slate-500">
          Your microphone is off and your tutor is waiting. Take your time, nothing is lost.
        </p>
        <Button className="w-full gap-2" onClick={onResume}>
          <Play className="h-4 w-4" />
          Resume lesson
        </Button>
        <Button variant="outline" className="w-full" onClick={onEnd}>
          End session
        </Button>
      </div>
    </div>
  );
}