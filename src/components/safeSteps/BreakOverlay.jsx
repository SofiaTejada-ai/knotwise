import React from "react";
import { Button } from "@/components/ui/button";

export default function BreakOverlay({ paused, onResume }) {
  if (!paused) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 p-4">
      <div className="max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xl font-medium text-slate-800">Break time. The lesson is paused.</p>
        <Button size="lg" onClick={onResume}>
          I am back
        </Button>
      </div>
    </div>
  );
}