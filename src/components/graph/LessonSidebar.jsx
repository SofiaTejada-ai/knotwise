import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mic, FileSearch, ListChecks, Settings } from "lucide-react";
import { LESSONS } from "@/lib/functionLessons";
import PrefControls from "./PrefControls";

const link = "flex min-h-[44px] items-center gap-2 rounded-lg px-3 hover:bg-[#EFEAE0]";

// Left navigation (216px). Hidden in Focus mode; a slide-in drawer on small screens.
export default function LessonSidebar({ prefs, open, onClose, lessonId }) {
  const [settings, setSettings] = useState(false);
  if (prefs.focus) return null;

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <nav
        aria-label="Main"
        className={`${open ? "flex" : "hidden lg:flex"} fixed inset-y-0 left-0 z-40 w-[216px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-[#E4DED2] bg-[#F4EFE6] p-3 lg:sticky lg:top-0 lg:h-screen lg:z-10`}
      >
        <Link to="/" onClick={onClose} className="mb-3 px-3 py-2 text-[1.2em] font-bold text-[#1F7A7A]">Knotwise</Link>
        <Link to="/livetutor" onClick={onClose} className={link}><Mic className="h-4 w-4" /> General Questions</Link>
        <Link to="/research" onClick={onClose} className={link}><FileSearch className="h-4 w-4" /> Research</Link>
        <Link to="/review" onClick={onClose} className={link}><ListChecks className="h-4 w-4" /> My Reviews</Link>

        <p className="mt-4 px-3 text-[0.8em] font-semibold uppercase tracking-wide text-[#5B6478]">Recent Lessons</p>
        {LESSONS.map((l) => (
          <Link
            key={l.id}
            to={`/graph-lesson?f=${l.id}`}
            onClick={onClose}
            aria-current={l.id === lessonId ? "page" : undefined}
            className={`${link} ${l.id === lessonId ? "bg-[#E3F1F1] font-semibold text-[#1F7A7A]" : ""}`}
          >
            {l.name}
          </Link>
        ))}

        <div className="mt-auto pt-4">
          {settings && <div className="mb-2 rounded-lg bg-white p-2"><PrefControls prefs={prefs} /></div>}
          <button type="button" onClick={() => setSettings(!settings)} aria-expanded={settings} className={`${link} w-full`}>
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </nav>
    </>
  );
}