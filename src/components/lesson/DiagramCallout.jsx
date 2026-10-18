import React from "react";

const TONE = {
  danger: "border-red-200 bg-red-50",
  safe: "border-emerald-200 bg-emerald-50",
  neutral: "border-slate-200 bg-slate-50"
};
const MARK = {
  danger: "bg-red-200 text-red-900",
  safe: "bg-emerald-200 text-emerald-900",
  neutral: "bg-amber-200 text-amber-900"
};

function Line({ line }) {
  const tone = line.tone || "neutral";
  const parts = line.mark && line.text.includes(line.mark) ? line.text.split(line.mark) : null;
  return (
    <div className={`rounded-lg border px-3 py-2 ${TONE[tone]}`}>
      {line.label && <p className="text-[11px] uppercase tracking-wide text-slate-500">{line.label}</p>}
      <p className="break-words font-mono text-sm text-slate-800">
        {parts ? (
          <>
            {parts[0]}
            <mark className={`rounded px-0.5 ${MARK[tone]}`}>{line.mark}</mark>
            {parts.slice(1).join(line.mark)}
          </>
        ) : (
          line.text
        )}
      </p>
    </div>
  );
}

// The concrete artifact for the current step: the actual query, packet,
// equation or value, with the important part highlighted.
export default function DiagramCallout({ callout }) {
  if (!callout?.lines?.length) return null;
  return (
    <div data-testid="diagram-callout" className="mx-auto mt-3 w-full max-w-3xl space-y-2">
      {callout.lines.map((l, i) => (
        <Line key={i} line={l} />
      ))}
      {callout.note && <p className="text-center text-xs text-slate-500">{callout.note}</p>}
    </div>
  );
}