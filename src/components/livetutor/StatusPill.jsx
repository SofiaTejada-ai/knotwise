import React from "react";
import { Button } from "@/components/ui/button";

const LABELS = {
  idle: "Voice off",
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Not connected"
};

const DOT = {
  idle: "bg-slate-400",
  connecting: "bg-slate-400 animate-pulse",
  listening: "bg-emerald-500",
  thinking: "bg-amber-400 animate-pulse",
  speaking: "bg-blue-500",
  error: "bg-red-500"
};

// Live session state, driven only by real events from the voice stream.
export default function StatusPill({ status, onRetry }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${DOT[status] ?? "bg-slate-400"}`} />
      {LABELS[status] ?? status}
      {(status === "error" || status === "idle") && onRetry && (
        <Button size="sm" variant="outline" className="ml-1 h-7 px-2 text-xs" onClick={onRetry}>
          Reconnect
        </Button>
      )}
    </div>
  );
}