import React, { useRef, useState } from "react";
import { useSpokenLesson } from "@/hooks/useSpokenLesson";
import ProfessorControls from "@/components/scholarviz/ProfessorControls";
import { VISUALS, isValidVisual } from "@/lib/visualRegistry";

// The shared professor for registry visuals: speaks each step aloud while
// the matching part of the visual is revealed.
export default function SpokenVisual({ spec }) {
  const [step, setStep] = useState(-1);
  const specRef = useRef(spec);
  specRef.current = spec;
  const lesson = useSpokenLesson({
    getScene: () => ({ sequence: specRef.current.steps }),
    goToStep: setStep,
    isAnimating: false
  });

  if (!isValidVisual(spec)) {
    return <p className="text-sm text-red-600">That visual could not be shown. Try making it again.</p>;
  }
  const { Component } = VISUALS[spec.kind];
  const interactive = spec.kind === "dragdrop";

  return (
    <div className="space-y-3" data-testid="spoken-visual">
      <p className="text-center font-medium text-[#1B2A49]">{spec.title}</p>
      <div className="rounded-xl border border-[#E3E7EB] bg-slate-50 p-4">
        <Component data={spec.data} step={interactive ? 0 : step < 0 && lesson.status === "idle" ? spec.steps.length : step} />
      </div>
      <ProfessorControls lesson={lesson} hasScene busy={false} noAsk onReplay={() => lesson.run(0)} />
    </div>
  );
}