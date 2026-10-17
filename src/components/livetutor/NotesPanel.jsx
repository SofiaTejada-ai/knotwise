import React from "react";
import { NotebookPen, HardDrive } from "lucide-react";

// Personal notes recorded quietly by the Notes Agent while the lesson runs.
// Notes are stored only in this browser on this device (prototype).
export default function NotesPanel({ notes = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
        <NotebookPen className="h-3.5 w-3.5" />
        Personal notes
      </p>
      <div className="mt-2 space-y-2">
        {notes.length === 0 && (
          <p className="text-sm text-slate-400">
            As you talk with your tutor, short notes about your questions and answers appear here.
          </p>
        )}
        {notes.map((n) => (
          <div key={n.nodeId} className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{n.label}</p>
            <p className="text-sm leading-relaxed text-slate-700">{n.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
        <HardDrive className="h-3 w-3 shrink-0" />
        Saved only in this browser on this device. Review &amp; Quiz keeps them.
      </p>
    </div>
  );
}