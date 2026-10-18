import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// Builds the final quiz: the 5 mixed questions from the lesson, or, for
// older saved lessons, up to 5 of the topic questions.
function buildQuestions(map) {
  if (map.finalQuiz?.length) return map.finalQuiz;
  return (map.nodes ?? [])
    .filter((n) => n.quiz)
    .slice(0, 5)
    .map((n) => ({ ...n.quiz, basedOn: n.label }));
}

// A 4 to 5 question quiz at the bottom: one question at a time, then a score.
export default function ResearchQuiz({ map }) {
  const questions = useMemo(() => buildQuestions(map), [map]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!questions.length) return null;
  const q = questions[index];
  const answered = picked != null;

  const choose = (i) => {
    if (answered) return;
    setPicked(i);
    if (i === q.correctIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) setFinished(true);
    else {
      setIndex(index + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6" data-testid="final-quiz">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-800">Lesson quiz</h2>
        {!finished && (
          <span className="text-xs text-slate-400">
            Question {index + 1} of {questions.length}
          </span>
        )}
      </div>

      {finished ? (
        <div className="mt-4 space-y-3 text-center">
          <p className="font-heading text-3xl font-semibold text-indigo-700">
            {score} / {questions.length}
          </p>
          <p className="text-sm text-slate-600">
            {score === questions.length
              ? "Perfect. You understood the whole lesson."
              : "Good effort. Review the topics above, then try again."}
          </p>
          <Button variant="outline" onClick={restart}>
            Try the quiz again
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {q.basedOn && <p className="text-xs uppercase tracking-wide text-indigo-500">From: {q.basedOn}</p>}
          <p className="text-sm font-medium text-slate-800">{q.question}</p>
          <div className="space-y-2">
            {q.choices.map((c, i) => {
              const right = answered && i === q.correctIndex;
              const wrong = answered && picked === i && i !== q.correctIndex;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={answered}
                  onClick={() => choose(i)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    right
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : wrong
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className="space-y-2">
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {picked === q.correctIndex ? "Correct! " : "Not quite. "}
                {q.explanation}
              </p>
              <Button onClick={next}>{index + 1 >= questions.length ? "See my score" : "Next question"}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}