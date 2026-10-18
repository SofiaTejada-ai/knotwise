import React from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { Clock } from "lucide-react";
import { loadSessions } from "@/lib/localSessionStore";
import { loadResearchSessions } from "@/lib/researchSessionStore";

export default function SessionHistory() {
  const tutor = loadSessions().map((s) => ({
    id: s.id,
    savedAt: s.savedAt,
    title: s.title || "Live tutor session",
    kind: "Live tutor",
    to: "/livetutor"
  }));
  const research = loadResearchSessions().map((s) => ({
    id: s.id,
    savedAt: s.savedAt,
    title: s.docTitle || s.fileName || "Research session",
    kind: "Research",
    to: "/research"
  }));
  const recent = [...tutor, ...research].sort((a, b) => b.savedAt - a.savedAt).slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-slate-400" />
        <h2 className="font-heading text-xl font-semibold text-slate-900">Your recent sessions</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Lessons you finish are saved on this device, so you can pick them up again here.
      </p>

      {recent.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-600">No sessions yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Your finished lessons will appear here. Start with a question or upload a document above.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {recent.map((s) => (
            <Link
              key={s.id}
              to={s.to}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm"
            >
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {s.kind}
              </span>
              <p className="mt-3 font-medium text-slate-900">{s.title}</p>
              <p className="mt-1 text-xs text-slate-400">{moment(s.savedAt).fromNow()}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}