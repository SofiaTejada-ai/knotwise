import React from "react";
import { Button } from "@/components/ui/button";
import SpeakQuestionButton from "./SpeakQuestionButton";
import { Pause, Play, Square, RotateCcw, MessageCircleQuestion } from "lucide-react";

const LABELS = {
  idle: "Ready",
  speaking: "Speaking",
  answering: "Answering you",
  paused: "Paused",
  done: "Lesson finished"
};

export default function ProfessorControls({ lesson, hasScene, busy, onReplay, onAsk, onSpoken, noAsk }) {
  const active = lesson.status === "speaking" || lesson.status === "answering";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E3E7EB] bg-white p-3" data-testid="professor-controls">
      <span
        className="rounded-full bg-[#E3F1F1] px-3 py-1 text-sm font-semibold text-[#1F7A7A]"
        aria-live="polite"
        data-testid="professor-status"
      >
        {busy ? "Thinking" : LABELS[lesson.status]}
        {lesson.stepIdx >= 0 && lesson.status !== "idle" ? ` · step ${lesson.stepIdx + 1}` : ""}
      </span>
      {active ? (
        <Button variant="outline" className="min-h-[44px]" onClick={lesson.pause}>
          <Pause className="mr-1 h-4 w-4" /> Pause
        </Button>
      ) : (
        <Button className="min-h-[44px]" disabled={!hasScene || busy} onClick={lesson.status === "paused" ? lesson.resume : () => lesson.run(0)}>
          <Play className="mr-1 h-4 w-4" /> {lesson.status === "paused" ? "Resume" : "Teach me"}
        </Button>
      )}
      <Button variant="outline" className="min-h-[44px]" disabled={lesson.status === "idle"} onClick={lesson.stop}>
        <Square className="mr-1 h-4 w-4" /> Stop
      </Button>
      <Button variant="outline" className="min-h-[44px]" disabled={!hasScene || busy} onClick={onReplay}>
        <RotateCcw className="mr-1 h-4 w-4" /> Replay
      </Button>
      {!noAsk && (
        <>
          <Button variant="outline" className="min-h-[44px]" disabled={!hasScene} onClick={onAsk}>
            <MessageCircleQuestion className="mr-1 h-4 w-4" /> Ask a question
          </Button>
          <SpeakQuestionButton disabled={!hasScene || busy} onStart={lesson.pause} onQuestion={onSpoken} />
        </>
      )}
      <label className="ml-auto flex items-center gap-2 text-sm text-[#5B6478]">
        Speed
        <select
          aria-label="Speaking speed"
          className="min-h-[44px] rounded-lg border border-[#E3E7EB] bg-white px-2"
          value={lesson.rate}
          onChange={(e) => lesson.setRate(Number(e.target.value))}
        >
          <option value={0.75}>Slower</option>
          <option value={1}>Normal</option>
          <option value={1.25}>Faster</option>
        </select>
      </label>
    </div>
  );
}