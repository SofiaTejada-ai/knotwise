import React from "react";

// Two columns; one row is revealed per spoken step.
export default function Comparison({ data, step }) {
  return (
    <div className="mx-auto max-w-2xl space-y-2" data-testid="visual-comparison">
      <div className="grid grid-cols-2 gap-2 text-center text-sm font-semibold text-white">
        <div className="rounded-lg bg-[#1F7A7A] p-2">{data.leftTitle}</div>
        <div className="rounded-lg bg-[#1B2A49] p-2">{data.rightTitle}</div>
      </div>
      {data.rows.map((r, i) => (
        <div key={i} className={`transition-opacity ${i <= step ? "opacity-100" : "opacity-15"}`}>
          <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-[#5B6478]">{r.aspect}</p>
          <div className={`grid grid-cols-2 gap-2 rounded-xl border p-1 ${i === step ? "border-[#1F7A7A]" : "border-[#E3E7EB]"}`}>
            <p className="rounded-lg bg-[#E3F1F1] p-3 text-sm text-[#1B2A49]">{r.left}</p>
            <p className="rounded-lg bg-slate-100 p-3 text-sm text-[#1B2A49]">{r.right}</p>
          </div>
        </div>
      ))}
    </div>
  );
}