import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Square } from "lucide-react";
import SceneQuiz from "./SceneQuiz";
import StatusPill from "./StatusPill";
import TechDiagram from "@/components/lesson/TechDiagram";
import DiagramSkeleton from "@/components/lesson/DiagramSkeleton";

// The immersive lesson scene: one focus at a time. While the professor
// teaches, the screen shows a literal technical diagram whose parts light up
// with each spoken step. Until the diagram is ready a quiet outline shows and
// the professor keeps talking. After the understanding check, the practice
// quiz becomes the focus. The only control is one small Stop lesson button.
export default function LessonScene({
  node,
  mode, // prep | present | quiz
  visual, // { nodes, edges } diagram for the topic, or null while drawing
  steps, // steps of the topic (null while drawing)
  stepIndex,
  stage, // optional animated scene element; replaces the simple diagram
  onNodeClick,
  captionsOn,
  captionText,
  voiceStatus,
  onRetryVoice,
  onStop,
  onAttempt,
  onStuck,
  reducedMotion = false
}) {
  const fade = reducedMotion ? { duration: 0 } : { duration: 0.4 };

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      {/* topic label + the single lesson control */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="max-w-[55%] truncate text-xs uppercase tracking-wide text-slate-400">
          {node?.label ?? ""}
        </p>
        <Button
          data-testid="stop-lesson"
          size="sm"
          variant="outline"
          className="gap-1.5 text-slate-500"
          onClick={onStop}
        >
          <Square className="h-3.5 w-3.5" />
          Stop lesson
        </Button>
      </div>

      {/* voice trouble is the only quiet extra: it appears only on an error */}
      {voiceStatus === "error" && (
        <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2">
          <StatusPill status={voiceStatus} onRetry={onRetryVoice} />
        </div>
      )}

      {/* the stage: one focus at a time */}
      <div className="flex flex-1 items-center justify-center px-6 pb-28 pt-16">
        {stage && <div className={mode === "quiz" ? "hidden" : "w-full max-w-5xl"}>{stage}</div>}
        {!stage && mode !== "quiz" && (
          <AnimatePresence mode="wait">
            <motion.div
              key={visual ? "diagram" : "wait"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
              className="flex w-full max-w-4xl justify-center"
            >
              {visual ? (
                <TechDiagram
                  visual={visual}
                  steps={steps ?? []}
                  stepIndex={mode === "present" ? stepIndex : null}
                  onNodeClick={onNodeClick}
                  reducedMotion={reducedMotion}
                />
              ) : (
                <DiagramSkeleton title={node?.label} reducedMotion={reducedMotion} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {mode === "quiz" && (
          <div className="w-full max-w-3xl">
            <SceneQuiz node={node} onAttempt={onAttempt} onStuck={onStuck} reducedMotion={reducedMotion} />
          </div>
        )}
      </div>

      {/* optional quiet captions */}
      {captionsOn && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 px-6">
          <p
            aria-live="polite"
            data-testid="caption-line"
            className="mx-auto max-w-xl truncate rounded-full bg-slate-50/80 px-4 py-1.5 text-center text-xs text-slate-400"
          >
            {captionText || ""}
          </p>
        </div>
      )}
    </div>
  );
}