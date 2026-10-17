import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Loader2, Square } from "lucide-react";
import SceneQuiz from "./SceneQuiz";
import StatusPill from "./StatusPill";

// The immersive lesson scene: one focus at a time. While the tutor presents,
// the screen shows the picture for the idea being spoken, one picture at a
// time. After the understanding check, the practice quiz becomes the focus.
// The only control is one small Stop lesson button; captions are optional
// and unobtrusive. No sidebars, notes, lists or progress panels.
export default function LessonScene({
  node,
  mode, // prep | present | quiz
  segment, // { idea, url } for the idea being spoken
  captionsOn,
  captionText,
  voiceStatus,
  onRetryVoice,
  onStop,
  onAttempt,
  onStuck,
  reducedMotion = false
}) {
  const fade = reducedMotion ? { duration: 0 } : { duration: 0.6 };

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
        {mode === "prep" && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className={reducedMotion ? "h-6 w-6" : "h-6 w-6 animate-spin"} />
            <p data-testid="prep-state" className="text-sm">
              Getting the pictures ready for this topic...
            </p>
          </div>
        )}

        {mode === "present" && (
          <AnimatePresence mode="wait">
            <motion.div
              key={segment?.idea ?? "none"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
              className="w-full max-w-2xl"
            >
              {segment?.url ? (
                <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                  <Image
                    src={segment.url}
                    alt={`Picture showing ${segment.idea}`}
                    className="aspect-[4/3] w-full"
                    fittingType="fill"
                  />
                </div>
              ) : (
                <p data-testid="no-picture" className="text-center text-sm text-slate-400">
                  No picture for this part. Keep listening to your tutor.
                </p>
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