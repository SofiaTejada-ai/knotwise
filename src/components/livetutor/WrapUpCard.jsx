import React from "react";
import { Button } from "@/components/ui/button";
import { PartyPopper, MessageCircleQuestion, Home, NotebookPen } from "lucide-react";

// End-of-lesson card: what was practiced, and where to go next.
export default function WrapUpCard({ map, practiceLog, onNewQuestion, onEnd, onReview }) {
  const nodes = map?.nodes ?? [];
  const solved = nodes.filter((n) => practiceLog?.[n.id]?.correct).length;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <p className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <PartyPopper className="h-5 w-5" />
          Lesson complete
        </p>
        <p className="text-sm text-slate-600">
          You explored "{map?.title}". You answered {solved} of {nodes.length} practice questions
          correctly on your own.
        </p>
        <p className="text-xs text-slate-400">
          Your notes, practice results, and progress are saved only in this browser on this device.
        </p>
        {onReview && (
          <Button variant="secondary" className="w-full gap-1.5" onClick={onReview}>
            <NotebookPen className="h-4 w-4" />
            Review this session and take the quiz
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          <Button className="gap-1" onClick={onNewQuestion}>
            <MessageCircleQuestion className="h-4 w-4" />
            Ask a new question
          </Button>
          <Button variant="outline" className="gap-1" onClick={onEnd}>
            <Home className="h-4 w-4" />
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}