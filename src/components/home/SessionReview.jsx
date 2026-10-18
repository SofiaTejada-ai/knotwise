import React, { useState } from "react";
import moment from "moment";
import { CheckCircle2, CircleDashed, FileText, Loader2, NotebookPen, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReviewQuizRunner from "@/components/review/ReviewQuizRunner";
import { updateSavedSession, loadSession } from "@/lib/localSessionStore";
import { groundQuiz, notesByTopic, quizPayload } from "@/lib/sessionReview";

// Looking back at one Live Tutor session: what the professor and the student
// went over (the Notes Agent's notes by topic), the examples and practice
// questions, and a final review quiz built only from this session.
export default function SessionReview({ session: initial, onClose }) {
  const [session, setSession] = useState(initial);
  const [quiz, setQuiz] = useState(null); // questions being taken
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState(null);
  if (!session) return null;

  const topics = notesByTopic(session);
  const asked = session.asked ?? [];
  const results = session.quizResults ?? [];
  const reload = () => setSession(loadSession(session.id) ?? session);

  const buildQuiz = async () => {
    setBuilding(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("buildReviewQuiz", { sessions: [quizPayload(session)] });
      const questions = groundQuiz(res?.data?.questions, session);
      if (questions.length < 2) throw new Error("ungrounded");
      updateSavedSession(session.id, (s) => ({ ...s, reviewQuiz: questions }));
      reload();
      setQuiz(questions);
    } catch (err) {
      setError("The review quiz could not be built from this session right now. Try again in a moment.");
    }
    setBuilding(false);
  };

  const finished = (score, total) => {
    updateSavedSession(session.id, (s) => ({ ...s, quizResults: [...(s.quizResults ?? []), { score, total, at: Date.now() }].slice(-10) }));
    reload();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{session.title}</DialogTitle>
          <DialogDescription>
            {moment(session.savedAt).format("MMM D, YYYY [at] h:mm a")}
            {session.documents?.length ? ` · from ${session.documents.join(", ")}` : ""}
          </DialogDescription>
        </DialogHeader>

        {quiz ? (
          <ReviewQuizRunner questions={quiz} onFinish={finished} onExit={() => setQuiz(null)} exitLabel="Back to this session" />
        ) : (
          <div className="space-y-6">
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <NotebookPen className="h-4 w-4" /> What we went over
              </h3>
              {topics.length ? (
                <div className="mt-3 space-y-3">
                  {topics.map((t) => (
                    <div key={t.id} className="rounded-xl border border-slate-200 p-4">
                      <p className="text-sm font-medium text-slate-900">{t.label}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                        {t.notes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">No notes were taken in this session.</p>
              )}
            </section>

            {!!session.examples?.length && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Sparkles className="h-4 w-4" /> Examples the professor used
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {session.examples.map((e) => (
                    <span key={e} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {e}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {!!asked.length && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FileText className="h-4 w-4" /> Practice during the lesson
                </h3>
                <ul className="mt-2 space-y-2">
                  {asked.map((q) => (
                    <li key={q.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                      <p className="text-slate-800">{q.question}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        {q.correct ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <CircleDashed className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        Answer: {q.choices?.[q.correct_index]}
                        {q.correct ? ` · solved${q.attempts > 1 ? ` in ${q.attempts} tries` : ""}` : " · worth reviewing"}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-800">Final review quiz</h3>
              <p className="mt-1 text-sm text-slate-500">
                A few questions built only from this session, focused on what was hardest.
                {results.length ? ` Last score: ${results[results.length - 1].score} of ${results[results.length - 1].total}.` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {session.reviewQuiz?.length ? (
                  <>
                    <Button onClick={() => setQuiz(session.reviewQuiz)}>Take the review quiz</Button>
                    <Button variant="outline" disabled={building} onClick={buildQuiz}>
                      {building ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                      New questions
                    </Button>
                  </>
                ) : (
                  <Button disabled={building || (!topics.length && !asked.length)} onClick={buildQuiz}>
                    {building ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    {building ? "Building your quiz..." : "Build my review quiz"}
                  </Button>
                )}
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
