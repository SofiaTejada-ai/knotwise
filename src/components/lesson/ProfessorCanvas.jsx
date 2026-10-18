import React, { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AnimationCanvas from "@/components/scholarviz/AnimationCanvas";
import StepControls from "@/components/scholarviz/StepControls";
import ProfessorControls from "@/components/scholarviz/ProfessorControls";
import { useSpokenLesson } from "@/hooks/useSpokenLesson";

// The shared professor + canvas: the animated scene, spoken step by step,
// with pause, replay, typed or spoken questions and resume. Used by the
// Research route; questions stay grounded in `groundingText`.
export default function ProfessorCanvas({ tutor, groundingText }) {
  const [q, setQ] = useState("");
  const lesson = useSpokenLesson({
    getScene: tutor.getScene,
    goToStep: tutor.goToStep,
    isAnimating: tutor.isAnimating
  });
  const seq = tutor.scene?.sequence ?? [];
  const step = seq[tutor.currentStep];

  const ask = async (text) => {
    const question = String(text ?? "").trim();
    if (!question || tutor.isLoading) return;
    const idx = lesson.getIndex();
    const wasMid = lesson.status !== "idle";
    lesson.pause();
    setQ("");
    const before = tutor.getScene()?.scene_id;
    const narration = await tutor.sendMessage(question, { groundingText });
    if (!narration) return;
    const after = tutor.getScene();
    const same = !!before && after?.scene_id === before;
    const inserted = Math.max(0, (after?.sequence ?? []).findIndex((s) => s.inserted));
    const finished = await lesson.say(narration);
    if (finished) lesson.run(same ? (wasMid ? idx : inserted) : 0);
  };

  return (
    <div className="space-y-3" data-testid="professor-canvas">
      <div className="relative h-[380px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <AnimationCanvas
          scene={tutor.scene}
          startStep={tutor.startStep}
          playToken={tutor.playToken}
          playMode={tutor.playMode}
          onStepComplete={tutor.setCurrentStep}
          onAnimatingChange={tutor.setIsAnimating}
          onMoveNode={tutor.moveNode}
          onUpdateObject={tutor.updateObject}
          paused={lesson.status === "paused"}
        />
        {step && (
          <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-lg bg-white/95 px-3 py-1.5 text-xs shadow-sm">
            <span className="font-semibold text-slate-700">
              STEP {tutor.currentStep + 1} of {seq.length}
            </span>
            {step.description && <span className="block text-slate-500">{step.description}</span>}
          </div>
        )}
      </div>
      <ProfessorControls
        lesson={lesson}
        hasScene={!!tutor.scene}
        busy={tutor.isLoading}
        onReplay={() => lesson.run(0)}
        onSpoken={ask}
        onAsk={lesson.pause}
      />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a question about this topic..." aria-label="Ask the professor" />
        <Button type="submit" variant="outline" disabled={!q.trim() || tutor.isLoading} aria-label="Send question">
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <div className="flex justify-center">
        <StepControls
          total={seq.length}
          current={tutor.currentStep}
          disabled={tutor.isAnimating || tutor.isLoading}
          onPrev={tutor.prevStep}
          onReplay={tutor.replayStep}
          onGoTo={tutor.goToStep}
          onNext={tutor.nextStep}
        />
      </div>
    </div>
  );
}