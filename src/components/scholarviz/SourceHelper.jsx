import React from "react";

// Source helper: shows the matching passage from the approved government
// sources, with the link so the student can check it themselves.
export default function SourceHelper({ source }) {
  if (!source) return null;
  return (
    <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Source for this animation</p>
      <p className="text-sm leading-relaxed text-slate-700">{source.passage}</p>
      <p className="text-xs text-slate-500">
        {source.publisher}. {source.title}. {source.date}.
      </p>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm font-medium text-blue-600 underline"
      >
        Check it yourself
      </a>
    </div>
  );
}