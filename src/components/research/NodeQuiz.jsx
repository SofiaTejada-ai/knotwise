import React, { useState } from "react";

// The short quiz at the bottom of a node explanation. The student can retry
// until they get it right; the result is reported to the session history.
export default function NodeQuiz({ node, onResult }) {
  const quiz = node?.quiz;
  const [picked, setPicked] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);

  if (!quiz?.question || !Array.isArray(quiz.choices) || quiz.choices.length < 2) return null;

  const choose = (i) => {
    if (solved) return;
    const correct = i === quiz.correctIndex;
    setPicked(i);
    const next = attempts + 1;
    setAttempts(next);
    onResult?.(node.id, { correct, attempts: next });
    if (correct) setSolved(true);
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4" data-testid="node-quiz">
      <p className="font-medium text-slate-800">Quick check</p>
      <p className="text-sm text-slate-700">{quiz.question}</p>
      <div className="space-y-2">
        {quiz.choices.map((c, i) => {
          const isRight = solved && i === quiz.correctIndex;
          const isWrong = !solved && picked === i;
          return (
            <button
              key={i}
              type="button"
              disabled={solved}
              onClick={() => choose(i)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                isRight
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : isWrong
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
      {picked != null && !solved && <p className="text-xs text-red-600">Not quite. Try another answer.</p>}
      {solved && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800" data-testid="quiz-solved">
          Correct! {quiz.explanation ?? ""} {attempts > 1 ? `You got it in ${attempts} tries.` : ""}
        </p>
      )}
    </div>
  );
}