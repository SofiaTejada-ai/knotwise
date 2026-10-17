import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, RotateCcw } from "lucide-react";

// Short practice question for the active node. Wrong answers can be retried;
// after two misses it reports that the student is stuck (the tutor then
// simplifies and a help picture can be requested).
export default function NodeQuiz({ node, onAttempt, onStuck, reducedMotion = false }) {
  const practice = node?.practice;
  const [wrong, setWrong] = useState([]);
  const [correct, setCorrect] = useState(false);
  const [hints, setHints] = useState(0);
  const [showHint, setShowHint] = useState(false);

  if (!practice || !Array.isArray(practice.choices) || practice.choices.length !== 3) return null;

  const attempts = wrong.length + (correct ? 1 : 0);

  const choose = (i) => {
    if (correct) return;
    if (i === practice.correct_index) {
      setCorrect(true);
      onAttempt?.(node.id, { attempts: attempts + 1, hints, correct: true });
    } else {
      const nextWrong = wrong.includes(i) ? wrong : [...wrong, i];
      setWrong(nextWrong);
      onAttempt?.(node.id, { attempts: nextWrong.length, hints, correct: false });
      if (nextWrong.length >= 2) onStuck?.(node.id);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-700">{practice.question}</p>
      <div className="space-y-1.5">
        {practice.choices.map((choice, i) => {
          const wasWrong = wrong.includes(i);
          return (
            <Button
              key={i}
              data-testid="quiz-choice"
              variant="outline"
              size="sm"
              className={`w-full justify-start text-left ${
                correct && i === practice.correct_index
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : wasWrong
                    ? "border-red-200 bg-red-50 text-red-500 line-through"
                    : ""
              }`}
              disabled={correct}
              onClick={() => choose(i)}
            >
              {choice}
            </Button>
          );
        })}
      </div>
      {!correct && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-slate-500"
            onClick={() => {
              if (!showHint) {
                setShowHint(true);
                setHints((h) => h + 1);
              }
            }}
          >
            <Lightbulb className="h-4 w-4" />
            {showHint ? "Hint shown" : "Show a hint"}
          </Button>
          {wrong.length > 0 && !correct && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <RotateCcw className="h-3 w-3" /> Try again
            </span>
          )}
        </div>
      )}
      {showHint && !correct && practice.hint && (
        <p className="text-xs text-slate-500">{practice.hint}</p>
      )}
      {correct && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {practice.explanation || "Nice work."}
        </p>
      )}
    </div>
  );
}