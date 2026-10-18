import React from "react";
import { Link } from "react-router-dom";
import { Menu, Square } from "lucide-react";
import PrefControls from "./PrefControls";

// Top bar: lesson title and goal on the left, display controls and Stop on the right.
export default function LessonTopBar({ lesson, prefs, onMenu }) {
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[#E4DED2] bg-[#FAF7F2] px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        {!prefs.focus && (
          <button type="button" onClick={onMenu} aria-label="Open menu" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#B9B2A3] bg-white lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[1.15em] font-semibold leading-tight">{lesson.title}</h1>
          <p className="truncate text-[0.85em] text-[#5B6478]">{lesson.goal}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PrefControls prefs={prefs} showFocus />
        <Link to="/" className="flex h-11 items-center gap-2 rounded-lg bg-[#1B2A49] px-4 font-semibold text-white">
          <Square className="h-4 w-4" /> Stop
        </Link>
      </div>
    </header>
  );
}