import React from "react";
import { BookOpenCheck, ExternalLink } from "lucide-react";

// Visible evidence panel: shows the source behind factual answers when one
// is available, and says so honestly when it is not.
export default function EvidenceBar({ evidence }) {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <BookOpenCheck className="h-4 w-4" />
        Evidence
      </p>
      {evidence?.url ? (
        <div className="space-y-1">
          <p className="text-sm leading-relaxed text-slate-600">{evidence.claim}</p>
          <a
            href={evidence.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 underline"
          >
            {evidence.source_name}
            <ExternalLink className="h-3 w-3" />
          </a>
          <p className="text-xs text-slate-400">Open the source to check this answer yourself.</p>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-slate-500">
          No verified public source is shown for this topic. Ask your tutor to explain it another way.
        </p>
      )}
    </div>
  );
}