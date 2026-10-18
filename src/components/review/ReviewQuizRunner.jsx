import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight, PartyPopper } from "lucide-react";

// Runs the cumulative review quiz question by question, with hints, retries
// and a friendly result summary at the end.
export default function ReviewQuizRunner({ questions, onExit, onFinish, exitLabel = "Back to my saved lessons" }) {
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [correct, setCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!Array.isArray(questions) || !questions.length) return null;

  if (finished) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <PartyPopper className="mx-auto h-8 w-8 text-blue-500" />
        <p className="text-lg font-semibold text-slate-800">
          You answered {score} of {questions.length} questions correctly
        </p>
        <p className="text-sm text-slate-500">
          Nice reviewing. You can retake the quiz any time, or start a new lesson.
        </p>
        <Button onClick={onExit}>{exitLabel}</Button>
      </div>
    );
  }

  const q = questions[index];
  const revealed = correct || wrong.length >= 2;

  const choose = (i) => {
    if (revealed) return;
    if (i === q.correct_index) {
      setCorrect(true);
      setScore((s) => s + 1);
    } else {
      setWrong((w) => (w.includes(i) ? w : [...w, i]));
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      onFinish?.(score, questions.length);
      return;
    }
    setIndex((i) => i + 1);
    setWrong([]);
    setCorrect(false);
    setShowHint(false);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">
        Question {index + 1} of {questions.length}
        {q.topic ? ` · ${q.topic}` : ""}
      </p>
      <p className="text-sm font-medium text-slate-700">{q.question}</p>
      <div className="space-y-1.5">
        {q.choices.map((choice, i) => (
          <Button
            key={i}
            data-testid="review-choice"
            variant="outline"
            size="sm"
            className={`w-full justify-start whitespace-normal break-words text-left ${
              revealed && i === q.correct_index
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : wrong.includes(i)
                  ? "border-red-200 bg-red-50 text-red-500 line-through"
                  : ""
            }`}
            disabled={revealed}
            onClick={() => choose(i)}
          >
            {choice}
          </Button>
        ))}
      </div>
      {!revealed && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 text-slate-500"
          onClick={() => setShowHint(true)}
        >
          <Lightbulb className="h-4 w-4" />
          Show a hint
        </Button>
      )}
      {showHint && !revealed && q.hint && <p className="text-xs text-slate-500">{q.hint}</p>}
      {revealed && q.explanation && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">{q.explanation}</p>
      )}
      {revealed && (
        <Button size="sm" className="ml-auto gap-1" onClick={next}>
          {index + 1 >= questions.length ? "See my results" : "Next question"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}