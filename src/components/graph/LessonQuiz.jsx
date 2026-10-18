import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { isCorrect } from "@/lib/functionRules";
import { saveMissedConcept } from "@/lib/reviewItems";

// Collapsed 3 question quiz. Answers are checked in code; a miss saves a ReviewItem.
export default function LessonQuiz({ lesson }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState("");

  const answer = async (qi, ci) => {
    if (answers[qi] !== undefined) return;
    setAnswers((a) => ({ ...a, [qi]: ci }));
    const question = lesson.questions[qi];
    if (isCorrect(question, ci)) return;
    try {
      await saveMissedConcept({ concept: question.concept, lessonId: lesson.id });
      setNote("Saved to My Reviews so you can try it again soon.");
    } catch (err) {
      setNote("We could not save this for review. Your answers are still on this page.");
    }
  };

  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <section className="rounded-2xl border border-[#E4DED2] bg-white">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2 text-left font-semibold">
        <Icon className="h-5 w-5" /> Check your understanding (3 questions)
      </button>
      {open && (
        <div className="space-y-6 border-t border-[#E4DED2] p-4">
          {lesson.questions.map((q, qi) => {
            const picked = answers[qi];
            return (
              <div key={qi}>
                <p className="font-semibold">{qi + 1}. {q.question}</p>
                <div className="mt-2 grid gap-2">
                  {q.choices.map((c, ci) => (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => answer(qi, ci)}
                      aria-pressed={picked === ci}
                      className={`min-h-[44px] rounded-lg border px-3 py-2 text-left ${
                        picked === ci ? "border-[#1F7A7A] bg-[#E3F1F1]" : "border-[#B9B2A3] bg-white hover:bg-[#F6F2EA]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {picked !== undefined && (
                  <p role="status" className="mt-2 text-[#5B6478]">
                    {isCorrect(q, picked) ? "Yes. " : `Not yet. The answer is "${q.choices[q.correctIndex]}". `}
                    {q.why}
                  </p>
                )}
              </div>
            );
          })}
          {note && <p role="status" className="text-[#5B6478]">{note}</p>}
        </div>
      )}
    </section>
  );
}