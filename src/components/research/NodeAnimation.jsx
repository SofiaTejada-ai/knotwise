import React from "react";
import { Clapperboard, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimationCanvas from "@/components/scholarviz/AnimationCanvas";
import StepControls from "@/components/scholarviz/StepControls";
import { useAnimationTutor } from "@/hooks/useAnimationTutor";

// The animated explanation of one topic, built only from the student's own
// document text. Step through it, replay it, or drag the pieces around.
export default function NodeAnimation({ node, docTitle }) {
  const tutor = useAnimationTutor();
  const seq = tutor.scene?.sequence ?? [];
  const step = seq[tutor.currentStep];

  const generate = () =>
    tutor.sendMessage(`Animate this topic from "${docTitle}": ${node.label}. ${node.explanation}`, {
      groundingText: `${node.label}\n${node.explanation}\n${node.excerpt ?? ""}`
    });

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4" data-testid="node-animation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium text-slate-800">
          <Clapperboard className="h-4 w-4 text-indigo-600" />
          Animated explanation
        </p>
        <div className="flex gap-2">
          {tutor.scene && (
            <Button variant="outline" size="sm" onClick={() => tutor.replay()}>
              Play all steps
            </Button>
          )}
          <Button size="sm" className="gap-2" disabled={tutor.isLoading} onClick={generate}>
            {tutor.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {tutor.scene ? "Make a new animation" : "Watch it animated"}
          </Button>
        </div>
      </div>

      {tutor.error && <p className="text-sm text-red-600">{tutor.error}</p>}

      {tutor.scene && (
        <div className="space-y-3">
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
          <StepControls
            total={seq.length}
            current={tutor.currentStep}
            disabled={tutor.isAnimating}
            onPrev={tutor.prevStep}
            onReplay={tutor.replayStep}
            onGoTo={tutor.goToStep}
            onNext={tutor.nextStep}
          />
          <p className="text-center text-xs text-slate-400">Tip: drag any shape to move it.</p>
        </div>
      )}
    </div>
  );
}