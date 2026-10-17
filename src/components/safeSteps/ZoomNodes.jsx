import React from "react";
import { Button } from "@/components/ui/button";
import * as L from "@/lib/safeStepsLogic";

export default function ZoomNodes({ state, onClose, onTap }) {
  const interactive = state.step === 3;
  const chip = (seg, i) => {
    const key = `${seg.kind}-${seg.id ?? "p"}-${i}`;
    const base = "rounded-xl border border-slate-200 px-4 py-3 text-2xl leading-snug";
    if (seg.kind === "plain") {
      const cls = `${base} text-slate-700`;
      return interactive ? (
        <button key={key} className={cls} onClick={() => onTap("plain")}>
          {seg.text}
        </button>
      ) : (
        <span key={key} className={cls}>{seg.text}</span>
      );
    }
    const found = state.found.includes(seg.id);
    const hinted = !found && state.outlined.includes(seg.id);
    const cls = `${base} ss-flag ${found ? "found" : ""} ${hinted ? "hinted" : ""} text-slate-800 ${
      interactive ? "cursor-pointer" : ""
    }`;
    const content = (
      <>
        {seg.text}
        {found ? " ✓" : ""}
      </>
    );
    return interactive ? (
      <button key={key} className={cls} onClick={() => onTap(seg.id)}>
        {content}
      </button>
    ) : (
      <span key={key} className={cls}>{content}</span>
    );
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Zoomed message</h2>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Header</p>
          <div className="flex flex-wrap gap-2">{L.MESSAGE_HEADER.map(chip)}</div>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Message</p>
          <div className="flex flex-wrap gap-2">{L.MESSAGE_BODY.map(chip)}</div>
        </div>
        {interactive && <p className="text-sm text-slate-500">Tap a phrase to select it as a red flag.</p>}
      </div>
    </div>
  );
}