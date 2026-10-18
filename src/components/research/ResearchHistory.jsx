import React from "react";
import { History } from "lucide-react";

// Saved research sessions on this device, newest first. Tapping one reopens
// its diagram, explanations and quiz results for review.
export default function ResearchHistory({ sessions, onOpen }) {
  if (!sessions.length) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6" data-testid="research-history">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-slate-800">
        <History className="h-4 w-4" />
        My research sessions
      </h2>
      <div className="divide-y divide-slate-100">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpen(s)}
            className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm text-slate-700 hover:text-slate-900"
          >
            <span className="truncate">{s.map?.title ?? s.docTitle ?? "Research session"}</span>
            <span className="shrink-0 text-xs text-slate-400">
              {new Date(s.savedAt).toLocaleDateString()} · {s.studiedNodes?.length ?? 0}/{s.map?.nodes?.length ?? 0} heard
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}