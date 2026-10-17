import React from "react";
import * as L from "@/lib/safeStepsLogic";

export default function MessageBubble({
  header = L.MESSAGE_HEADER,
  body = L.MESSAGE_BODY,
  foundIds = [],
  hintedIds = [],
  forceFound = false,
  highlightId = null,
  interactive = false,
  onTap,
  zoom = 1,
}) {
  const renderSeg = (seg, i) => {
    const key = `${seg.kind}-${seg.id ?? "p"}-${i}`;
    const tapProps =
      interactive && onTap
        ? { onClick: (e) => { e.stopPropagation(); onTap(seg.kind === "plain" ? "plain" : seg.id); } }
        : {};
    if (seg.kind === "plain") {
      return (
        <span key={key} data-target="plain" className={interactive ? "cursor-pointer rounded-sm" : ""} {...tapProps}>
          {seg.text}
        </span>
      );
    }
    const found = (seg.kind === "flag" && forceFound) || foundIds.includes(seg.id);
    const hinted = !found && hintedIds.includes(seg.id);
    const cls = [
      "ss-flag",
      found ? "found" : "",
      hinted ? "hinted" : "",
      highlightId === seg.id ? "review" : "",
      interactive ? "cursor-pointer" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <span key={key} data-target={seg.id} className={cls} {...tapProps}>
        {seg.text}
        {found ? " ✓" : ""}
      </span>
    );
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 leading-snug text-slate-400" style={{ fontSize: `${Math.round(14 * zoom)}px` }}>
        {header.map(renderSeg)}
      </div>
      <div className="leading-relaxed text-slate-800" style={{ fontSize: `${Math.round(18 * zoom)}px` }}>
        {body.map(renderSeg)}
      </div>
    </div>
  );
}