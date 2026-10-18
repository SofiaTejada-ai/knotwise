import React, { useRef } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { ACCEPT } from "@/lib/documentRag";

const STEPS = {
  uploading: "Uploading",
  reading: "Reading",
  indexing: "Preparing passages"
};

// Quiet control at the bottom of Live Tutor: add class material (PDF, Word,
// PowerPoint), see its progress, see which document the professor is using,
// and remove it. It never covers the teaching canvas.
export default function DocumentBar({ doc, onPick, onRemove }) {
  const inputRef = useRef(null);
  const busy = doc && STEPS[doc.status];

  return (
    <div data-testid="document-bar" className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-2 py-1 text-xs text-slate-500 shadow-sm backdrop-blur">
        {doc?.status === "ready" ? (
          <span className="flex max-w-[60vw] items-center gap-1.5 truncate pl-2 text-slate-700" title={doc.name}>
            <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">{doc.name}</span>
            <span className="shrink-0 text-slate-400">
              · {doc.sections} {doc.unit}
            </span>
          </span>
        ) : busy ? (
          <span className="flex items-center gap-1.5 pl-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {STEPS[doc.status]} {doc.name ? `"${doc.name}"` : ""}
            {doc.progress ? ` (${doc.progress})` : ""}...
          </span>
        ) : null}

        {doc?.status === "ready" ? (
          <button
            type="button"
            aria-label="Remove document"
            onClick={onRemove}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          !busy && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-slate-100 hover:text-slate-700"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Add class material (PDF, Word, PowerPoint)
            </button>
          )
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onPick(f);
          }}
        />
      </div>
      {doc?.status === "error" && <p className="max-w-md text-center text-xs text-red-600">{doc.error}</p>}
    </div>
  );
}
