import React from "react";
import { X } from "lucide-react";

export default function TopicChips({ topics, selected, onSelect, onClear }) {
  if (!topics?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-3 py-2">
      {selected ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white"
        >
          + {selected.label} lens
          <X className="h-3 w-3" />
        </button>
      ) : (
        topics.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600"
          >
            {t.label}
          </button>
        ))
      )}
    </div>
  );
}