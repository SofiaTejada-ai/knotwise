import React from "react";
import { Mic, Volume2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Friendly pre-session reminder: find a quiet space. The student chooses when
// to begin; nothing is blocked.
export default function QuietRoomCheck({ onBegin, onBack }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
          <Volume2 className="h-7 w-7 text-blue-500" />
        </div>
        <p className="text-lg leading-relaxed text-slate-700">
          For the clearest conversation, please find a quiet space and lower any background noise
          before we begin.
        </p>
        <p className="text-sm text-slate-500">
          Take your time. Whenever you are ready, tap Start tutor.
        </p>
        <Button size="lg" className="w-full gap-2" onClick={onBegin}>
          <Mic className="h-5 w-5" />
          Start tutor
        </Button>
        <Button variant="ghost" size="sm" className="w-full gap-1 text-slate-500" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Go back and change my setup
        </Button>
      </div>
    </div>
  );
}