import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getLesson } from "@/lib/functionLessons";
import { useLessonPrefs } from "@/hooks/useLessonPrefs";
import { useFunctionLesson } from "@/hooks/useFunctionLesson";
import LessonErrorBoundary from "@/components/graph/LessonErrorBoundary";
import LessonSidebar from "@/components/graph/LessonSidebar";
import LessonTopBar from "@/components/graph/LessonTopBar";
import LessonBody from "@/components/graph/LessonBody";
import ProfessorPanel from "@/components/graph/ProfessorPanel";

function LessonShell({ lesson }) {
  const prefs = useLessonPrefs();
  const lessonState = useFunctionLesson(lesson);
  const [navOpen, setNavOpen] = useState(false);
  const [profOpen, setProfOpen] = useState(() => window.innerWidth >= 1024);

  return (
    <div
      className={`fg-root flex min-h-screen bg-[#FAF7F2] text-[#1B2A49] ${prefs.reduceMotion ? "fg-reduce" : ""}`}
      style={{ fontSize: prefs.textSize, lineHeight: 1.6 }}
    >
      <LessonSidebar prefs={prefs} open={navOpen} onClose={() => setNavOpen(false)} lessonId={lesson.id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <LessonTopBar lesson={lesson} prefs={prefs} onMenu={() => setNavOpen(true)} />
        <div className="flex flex-1 flex-col lg:flex-row">
          <LessonBody lesson={lesson} lessonState={lessonState} focus={prefs.focus} />
          {!prefs.focus && (
            <ProfessorPanel transcript={lessonState.transcript} open={profOpen} onToggle={() => setProfOpen(!profOpen)} />
          )}
        </div>
      </div>
    </div>
  );
}

// Offline function graph lesson. Switching formula restarts the lesson.
export default function FunctionLesson() {
  const [params] = useSearchParams();
  const lesson = getLesson(params.get("f"));
  return (
    <LessonErrorBoundary>
      <LessonShell key={lesson.id} lesson={lesson} />
    </LessonErrorBoundary>
  );
}