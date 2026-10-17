import React from "react";
import * as L from "@/lib/safeStepsLogic";

function SourceCard({ big, title, claim, publisher, sourceTitle, date, url, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full space-y-1 rounded-xl border p-4 text-left ${
        active
          ? "border-[color:var(--ss-accent)] bg-[color:var(--ss-accent-soft)]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {big && <span className="block text-xl font-semibold text-[color:var(--ss-accent)]">{big}</span>}
      <span className="block font-medium text-slate-800">{title}</span>
      <span className="block text-sm text-slate-600">{claim}</span>
      <span className="block text-xs text-slate-500">
        {publisher}. {sourceTitle}. {date}.
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-block text-sm font-medium underline text-[color:var(--ss-accent)]"
      >
        Check it yourself
      </a>
    </button>
  );
}

export default function EvidencePanel({ state, send }) {
  if (![3, 4, 5].includes(state.step)) return null;
  const found = L.accounted(state);
  const ids = state.step === 3 ? L.FLAG_IDS.filter((id) => found.includes(id)) : L.FLAG_IDS;
  return (
    <aside className="min-w-0 space-y-3" aria-label="Evidence">
      <h2 className="text-lg font-semibold text-slate-800">Evidence</h2>
      {state.step === 5 && (
        <SourceCard
          big="$470 million"
          title={L.SOURCES.S3.title}
          claim={L.LINES.evidenceStat[1]}
          publisher={L.SOURCES.S3.publisher}
          sourceTitle={L.SOURCES.S3.title}
          date={L.SOURCES.S3.date}
          url={L.SOURCES.S3.url}
          active={state.activeEvidence === "stat"}
          onClick={() => send({ type: "SHOW_EVIDENCE", id: "stat" })}
        />
      )}
      {ids.map((id) => {
        const f = L.flagById(id);
        const src = L.SOURCES[f.source];
        return (
          <SourceCard
            key={id}
            title={f.text}
            claim={f.claim}
            publisher={src.publisher}
            sourceTitle={src.title}
            date={src.date}
            url={src.url}
            active={state.activeEvidence === id}
            onClick={() => send({ type: "SHOW_EVIDENCE", id })}
          />
        );
      })}
      {state.step === 3 && ids.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Red flags you find will appear here with their sources.
        </p>
      )}
      <p className="pt-1 text-xs text-slate-500">All sources opened and checked on {L.DATE_CHECKED}.</p>
    </aside>
  );
}