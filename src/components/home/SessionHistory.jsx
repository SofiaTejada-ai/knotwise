import React, { useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { Clock, FileText, ListChecks, NotebookPen } from "lucide-react";
import { loadSessions } from "@/lib/localSessionStore";
import { hasContent } from "@/lib/sessionReview";
import SessionReview from "@/components/home/SessionReview";

// Session history: every Live Tutor session with what was covered, saved on
// this device. Opening one shows its notes, practice and a final review quiz.
export default function SessionHistory() {
  const [open, setOpen] = useState(null);
  const [version, setVersion] = useState(0); // reload after a quiz is taken
  const sessions = loadSessions()
    .filter(hasContent)
    .sort((a, b) => (b.updatedAt ?? b.savedAt) - (a.updatedAt ?? a.savedAt))
    .slice(0, 12);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-20" data-version={version}>
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-slate-400" />
        <h2 className="font-heading text-xl font-semibold text-slate-900">Your session history</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Everything you went over with the professor is saved on this device. Open a session to re-read it and take its review
        quiz.
      </p>

      {sessions.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-600">No sessions yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Your lessons will appear here.{" "}
            <Link to="/livetutor" className="underline hover:text-slate-600">
              Start one in Live Tutor
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {sessions.map((s) => {
            const last = s.quizResults?.[s.quizResults.length - 1];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpen(s)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <p className="font-medium text-slate-900">{s.title}</p>
                <p className="mt-1 text-xs text-slate-400">{moment(s.savedAt).fromNow()}</p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <NotebookPen className="h-3.5 w-3.5" /> {s.notes?.length ?? 0} notes
                  </span>
                  {!!s.documents?.length && (
                    <span className="flex max-w-full items-center gap-1 truncate">
                      <FileText className="h-3.5 w-3.5 shrink-0" /> {s.documents[0]}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <ListChecks className="h-3.5 w-3.5" /> {last ? `quiz ${last.score}/${last.total}` : "review quiz"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <SessionReview
          session={open}
          onClose={() => {
            setOpen(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </section>
  );
}
