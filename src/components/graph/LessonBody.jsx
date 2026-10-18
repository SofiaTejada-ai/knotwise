import React from "react";
import { Link } from "react-router-dom";
import { LESSONS } from "@/lib/functionLessons";
import { useFunctionLesson } from "@/hooks/useFunctionLesson";
import GraphCanvas from "./GraphCanvas";
import ParamSlider from "./ParamSlider";
import PredictBox from "./PredictBox";
import LessonQuiz from "./LessonQuiz";

// Center column: formula tabs, canvas, slider, instruction, quiz and takeaways.
export default function LessonBody({ lesson, lessonState, focus }) {
  const s = lessonState;
  const lastProfessor = [...s.transcript].reverse().find((m) => m.who === "professor");

  return (
    <main className="min-w-0 flex-1 space-y-5 px-4 py-6 pb-24 lg:px-8 lg:pb-8">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a formula">
        {LESSONS.map((l) => (
          <Link
            key={l.id}
            to={`/graph-lesson?f=${l.id}`}
            aria-current={l.id === lesson.id ? "page" : undefined}
            className={`flex h-11 items-center rounded-lg border px-4 font-semibold ${
              l.id === lesson.id ? "border-[#1F7A7A] bg-[#E3F1F1] text-[#1F7A7A]" : "border-[#B9B2A3] bg-white"
            }`}
          >
            {l.name}
          </Link>
        ))}
      </div>

      <PredictBox x={lesson.predictX} prediction={s.prediction} onSubmit={s.submitGuess} />
      <GraphCanvas lesson={lesson} params={s.params} prediction={s.prediction} />
      <ParamSlider slider={lesson.slider} value={s.value} onChange={s.setValue} onRelease={s.release} disabled={!s.unlocked} />
      <p className="text-[#5B6478]">{lesson.instruction}</p>
      {focus && lastProfessor && <p className="rounded-xl bg-[#F6F2EA] px-3 py-2">Professor: {lastProfessor.text}</p>}

      <LessonQuiz lesson={lesson} />

      <section>
        <h2 className="mb-2 text-[1.15em] font-semibold">Three takeaways</h2>
        <ol className="list-decimal space-y-2 pl-6">
          {lesson.takeaways.map((t) => <li key={t}>{t}</li>)}
        </ol>
      </section>
    </main>
  );
}