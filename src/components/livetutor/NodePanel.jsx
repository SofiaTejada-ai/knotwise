import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, SkipForward, Sparkles, X } from "lucide-react";
import ExampleText from "./ExampleText";
import NodeQuiz from "./NodeQuiz";

// Side panel for the node the tutor is teaching: description, example the
// student can circle, practice question, and ways to get help or move on.
export default function NodePanel({
  node,
  building,
  onAttempt,
  onStuck,
  onMoveOn,
  onSkip
}) {
  if (!node) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Sparkles className="h-4 w-4" />
          {building ? "Building your learning map..." : "Ask your question to begin."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-400">Now learning</p>
        <h2 className="font-heading text-lg font-semibold text-slate-800">{node.label}</h2>
        <p className="text-sm leading-relaxed text-slate-600">{node.description}</p>
      </div>

      {node.example && <ExampleText example={node.example} />}

      <NodeQuiz node={node} onAttempt={onAttempt} onStuck={onStuck} />

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <Button size="sm" variant="outline" className="gap-1" onClick={onSkip}>
          <SkipForward className="h-4 w-4" />
          Skip
        </Button>
        <Button size="sm" className="ml-auto gap-1" onClick={onMoveOn}>
          Move on
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}