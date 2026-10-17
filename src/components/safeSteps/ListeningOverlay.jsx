import React from "react";
import { Button } from "@/components/ui/button";

export default function ListeningOverlay({ onStop, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="relative h-full">
        <span className="ss-square" aria-hidden="true" />
        <div className="mx-auto max-w-md space-y-4 px-4 pt-24 text-center">
          <p className="text-xl font-medium text-slate-800">Listening</p>
          <p className="text-base leading-relaxed text-slate-600">
            Speak your question, then press Stop and send. You can also cancel and type your question instead.
          </p>
          <div className="flex justify-center gap-3">
            <Button size="lg" onClick={onStop}>
              Stop and send
            </Button>
            <Button size="lg" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}