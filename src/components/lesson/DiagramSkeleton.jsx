import React from "react";

// Placeholder shown while a diagram is still being drawn. The professor keeps
// talking meanwhile; this is only a quiet outline of "boxes and arrows".
export default function DiagramSkeleton({ title, reducedMotion = false }) {
  const pulse = reducedMotion ? "" : "animate-pulse";
  return (
    <div data-testid="prep-state" className="w-full max-w-3xl text-center">
      <div className={`flex items-center justify-center gap-3 ${pulse}`}>
        <div className="h-16 w-36 rounded-md border border-slate-200 bg-slate-50" />
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className="h-16 w-36 rounded-md border border-slate-200 bg-slate-50" />
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className="h-16 w-36 rounded-md border border-slate-200 bg-slate-50" />
      </div>
      {title && <p className="mt-6 truncate text-xs uppercase tracking-wide text-slate-400">{title}</p>}
    </div>
  );
}