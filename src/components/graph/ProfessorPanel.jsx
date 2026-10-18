import React, { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, GraduationCap } from "lucide-react";

// The Professor: a short transcript of template replies. Right column on desktop, bottom sheet on mobile.
export default function ProfessorPanel({ transcript, open, onToggle }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [transcript, open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded="false"
        className="fixed bottom-3 right-3 z-30 flex h-11 items-center gap-2 rounded-full bg-[#2E8B8B] px-4 font-semibold text-white shadow-lg lg:static lg:m-4 lg:self-start lg:rounded-lg"
      >
        <GraduationCap className="h-5 w-5" /> Professor <ChevronUp className="h-4 w-4 lg:hidden" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Professor"
      className="fixed inset-x-0 bottom-0 z-30 flex max-h-[55vh] flex-col rounded-t-2xl border-t border-[#E4DED2] bg-white shadow-2xl lg:static lg:max-h-none lg:w-[30%] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
    >
      <div className="flex items-center justify-between border-b border-[#E4DED2] px-4 py-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 text-[#1F7A7A]" /> Professor
        </h2>
        <button type="button" onClick={onToggle} aria-expanded="true" aria-label="Hide professor" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[#F1ECE2]">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
      <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="professor-transcript">
        {transcript.map((m, i) => (
          <p
            key={i}
            className={
              m.who === "student"
                ? "ml-8 rounded-2xl bg-[#E3F1F1] px-3 py-2 text-right"
                : "mr-8 rounded-2xl bg-[#F6F2EA] px-3 py-2"
            }
          >
            {m.text}
          </p>
        ))}
      </div>
    </aside>
  );
}