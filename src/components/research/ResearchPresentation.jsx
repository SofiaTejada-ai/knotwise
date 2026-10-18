import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import StatusPill from "@/components/livetutor/StatusPill";

// The uncluttered presentation view: shown ONLY while the professor is
// speaking. One picture at a time, one small Stop control, nothing else.
// When the professor finishes, this overlay closes and the full diagram,
// explanations and quizzes come back.
export default function ResearchPresentation({ node, segment, voiceStatus, onRetryVoice, onStop }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="max-w-[55%] truncate text-xs uppercase tracking-wide text-slate-400">{node?.label ?? ""}</p>
        <Button data-testid="stop-presentation" size="sm" variant="outline" className="gap-1.5 text-slate-500" onClick={onStop}>
          <Square className="h-3.5 w-3.5" />
          Stop
        </Button>
      </div>

      {voiceStatus === "error" && (
        <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2">
          <StatusPill status={voiceStatus} onRetry={onRetryVoice} />
        </div>
      )}

      <div className="flex flex-1 items-center justify-center px-6 pb-20 pt-14">
        {!segment ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p data-testid="research-prep" className="text-sm">
              Getting the pictures ready for this topic...
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={segment.idea ?? "none"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-2xl"
            >
              {segment.url ? (
                <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                  <Image
                    src={segment.url}
                    alt={`Picture showing ${segment.idea}`}
                    className="aspect-[4/3] w-full"
                    fittingType="fill"
                  />
                </div>
              ) : (
                <p className="text-center text-sm text-slate-400">No picture for this part. Keep listening to the professor.</p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}