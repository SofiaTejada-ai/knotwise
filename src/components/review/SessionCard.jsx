import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CircleDashed } from "lucide-react";

// One saved lesson: progress, quiz results and notes, expandable in place.
export default function SessionCard({ session }) {
  const [open, setOpen] = useState(false);
  const nodes = session?.nodes ?? [];
  const completed = (session?.completedNodes ?? []).length;
  const notes = session?.notes ?? [];
  const practiceLog = session?.practiceLog ?? {};

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{session?.title ?? "Saved lesson"}</p>
          <p className="text-xs text-slate-400">
            {session?.savedAt ? new Date(session.savedAt).toLocaleString() : ""} · {completed} of {nodes.length} topics
            completed · {notes.length} {notes.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Open"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div className="space-y-1.5">
            {nodes.map((n) => {
              const p = practiceLog[n.id];
              return (
                <div key={n.id} className="rounded-xl border border-slate-100 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-sm text-slate-700">
                    {p?.correct ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <CircleDashed className="h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    {n.label}
                  </p>
                  {(p?.attempts || p?.hints) && (
                    <p className="pl-5 text-xs text-slate-400">
                      {p.attempts || 1} attempt(s)
                      {p.hints ? `, ${p.hints} hint(s)` : ""}
                      {p.correct ? ", answered correctly" : ", not answered correctly yet"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {notes.length > 0 && (
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-3">
              {notes.map((nt) => (
                <p key={nt.nodeId} className="text-sm leading-relaxed text-slate-600">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{nt.label}: </span>
                  {nt.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}