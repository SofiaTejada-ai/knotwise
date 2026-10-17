import React from "react";
import { Button } from "@/components/ui/button";
import * as L from "@/lib/safeStepsLogic";

export default function QuizPanel({ state, send }) {
  const q = state.quiz;

  if (q.phase === "ready") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800">Ready for a quiz?</h2>
        <p className="text-lg text-slate-700">It has 3 short questions and no timer.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button size="lg" onClick={() => send({ type: "QUIZ_READY", answer: "yes" })}>
            Yes, start
          </Button>
          <Button size="lg" variant="outline" onClick={() => send({ type: "QUIZ_READY", answer: "notyet" })}>
            Not yet, practice more
          </Button>
          <Button size="lg" variant="outline" onClick={() => send({ type: "PAUSE" })}>
            I need a break
          </Button>
        </div>
      </div>
    );
  }

  if (q.phase === "done") {
    return (
      <div className="max-w-xl space-y-4">
        <h2 className="text-xl font-semibold text-slate-800">You finished the lesson</h2>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-medium text-slate-800">Three steps to remember:</p>
          <ol className="list-inside list-decimal space-y-2 text-lg leading-relaxed text-slate-700">
            {L.TAKE_HOME.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <Button onClick={() => window.print()}>Save or print</Button>
        </div>
      </div>
    );
  }

  const sc = L.SCENARIOS[q.index];
  const answered = q.status === "right" || q.status === "explained";
  const explain =
    q.status === "explained" || (q.status === "right" && q.picked !== "unsure")
      ? sc.explain
      : L.LINES.quizUnsure.join(" ");
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-500">
        Question {q.index + 1} of {L.SCENARIOS.length}
      </p>
      <p className="text-lg text-slate-800">{sc.context}</p>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm text-slate-400">From: {sc.from}</p>
        <p className="text-lg leading-relaxed text-slate-800">{sc.message}</p>
      </div>
      {q.status === "hint" && (
        <div className="ss-hint-box max-w-md rounded-xl p-4 text-base leading-relaxed">
          {sc.hint} You can try again.
        </div>
      )}
      {answered && (
        <div className="max-w-xl space-y-3">
          <p className="text-lg leading-relaxed text-slate-800">{explain}</p>
          {q.status === "explained" && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Sources:</p>
              {sc.sources.map((id) => (
                <a
                  key={id}
                  href={L.SOURCES[id].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm underline text-[color:var(--ss-accent)]"
                >
                  {L.SOURCES[id].publisher}: {L.SOURCES[id].title}
                </a>
              ))}
            </div>
          )}
          <Button size="lg" onClick={() => send({ type: "QUIZ_NEXT" })}>
            {q.index + 1 < L.SCENARIOS.length ? "Next question" : "Finish"}
          </Button>
        </div>
      )}
      {!answered && (
        <div className="flex max-w-md flex-col gap-3">
          {L.QUIZ_CHOICES.map((c) => (
            <Button
              key={c.id}
              variant="outline"
              className="h-auto justify-start whitespace-normal py-3 text-base"
              onClick={() => send({ type: "QUIZ_ANSWER", choice: c.id })}
            >
              {c.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}