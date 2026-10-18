import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import MissedConcepts from "@/components/review/MissedConcepts";
import { Button } from "@/components/ui/button";
import { ClipboardList, HardDrive, Loader2, BookOpenCheck } from "lucide-react";
import SessionCard from "@/components/review/SessionCard";
import ReviewQuizRunner from "@/components/review/ReviewQuizRunner";
import { loadSessions } from "@/lib/localSessionStore";

// Review & Quiz: saved lessons from this browser, plus a cumulative quiz the
// tutor builds around what the student studied and struggled with.
export default function ReviewQuiz() {
  const [sessions, setSessions] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const startQuiz = async () => {
    if (!sessions?.length) return;
    setError(null);
    setBuilding(true);
    try {
      const payload = sessions.map((s) => ({
        title: s.title ?? "Saved lesson",
        ageRange: s.profile?.ageRange ?? "",
        nodes: (s.nodes ?? []).map((n) => {
          const p = (s.practiceLog ?? {})[n.id];
          return {
            label: n.label,
            description: n.description,
            attempts: p?.attempts ?? 0,
            hints: p?.hints ?? 0,
            correct: !!p?.correct
          };
        }),
        notes: (s.notes ?? []).map((nt) => nt.text)
      }));
      const res = await base44.functions.invoke("buildReviewQuiz", { sessions: payload });
      const questions = res?.data?.questions;
      if (!Array.isArray(questions) || !questions.length) throw new Error("empty");
      setQuiz(questions);
    } catch (err) {
      setError("The review quiz could not be built right now. Try again in a moment.");
    }
    setBuilding(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-semibold text-slate-800">Review &amp; Quiz</h1>
          <p className="mt-1 text-sm text-slate-500">
            Revisit your saved lessons and take a cumulative quiz about what you studied.
          </p>
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-600">
            <HardDrive className="h-3.5 w-3.5" />
            Saved lessons live only in this browser on this device.
          </p>
        </div>

        {!quiz && <MissedConcepts />}

        {quiz ? (
          <ReviewQuizRunner
            questions={quiz}
            onExit={() => {
              setQuiz(null);
              setSessions(loadSessions());
            }}
          />
        ) : (
          <>
            {sessions === null && (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening your saved lessons...
              </div>
            )}

            {sessions !== null && sessions.length === 0 && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-600">
                  No saved lessons yet. When you learn with the live tutor, your notes and practice
                  results are saved here on this device.
                </p>
                <Link
                  to="/livetutor"
                  className="inline-flex h-9 items-center gap-1 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <BookOpenCheck className="h-4 w-4" />
                  Start a live tutor lesson
                </Link>
              </div>
            )}

            {sessions?.length > 0 && (
              <>
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
                <Button size="lg" className="w-full gap-2" disabled={building} onClick={startQuiz}>
                  {building ? <Loader2 className="h-5 w-5 animate-spin" /> : <ClipboardList className="h-5 w-5" />}
                  {building ? "Building your review quiz..." : "Start my cumulative quiz"}
                </Button>
                {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}