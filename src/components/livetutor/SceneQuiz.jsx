import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, PenLine } from "lucide-react";

// The practice quiz as the scene's main focus: the student answers by tapping
// an object or circling it with a drawn loop. Feedback reflects their actual
// response; the tutor talks about it by voice.
export default function SceneQuiz({ node, onAttempt, onStuck, reducedMotion = false }) {
  const practice = node?.practice;
  const [wrong, setWrong] = useState([]);
  const [correct, setCorrect] = useState(false);
  const [hints, setHints] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [strokes, setStrokes] = useState([]); // finished loops
  const [draft, setDraft] = useState(null); // loop being drawn
  const drawingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pointsRef = useRef(null);
  const boardRef = useRef(null);
  const optionRefs = useRef([]);

  if (!practice || !Array.isArray(practice.choices) || practice.choices.length !== 3) {
    return <p className="text-center text-sm text-slate-400">No practice for this topic. Keep talking with your tutor.</p>;
  }

  const attempts = wrong.length + (correct ? 1 : 0);

  const choose = (i) => {
    if (correct || suppressClickRef.current) return;
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

  // --- circling: a drawn loop over an object selects it ---
  const toLocal = (e) => {
    const rect = boardRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (points) => {
    const boardRect = boardRef.current.getBoundingClientRect();
    for (let i = 0; i < optionRefs.current.length; i++) {
      const el = optionRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const left = r.left - boardRect.left;
      const top = r.top - boardRect.top;
      const right = r.right - boardRect.left;
      const bottom = r.bottom - boardRect.top;
      const pad = 12;
      const inside = points.some(
        (p) => p.x >= left - pad && p.x <= right + pad && p.y >= top - pad && p.y <= bottom + pad
      );
      if (inside) return i;
    }
    return null;
  };

  const onPointerDown = (e) => {
    if (correct) return;
    drawingRef.current = false;
    pointsRef.current = [toLocal(e)];
  };

  const onPointerMove = (e) => {
    if (!pointsRef.current || correct) return;
    const p = toLocal(e);
    const first = pointsRef.current[0];
    if (!drawingRef.current && Math.hypot(p.x - first.x, p.y - first.y) > 14) {
      drawingRef.current = true;
    }
    if (drawingRef.current) {
      pointsRef.current.push(p);
      setDraft([...pointsRef.current]);
    }
  };

  const finishStroke = () => {
    if (!pointsRef.current) return;
    if (drawingRef.current) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 150);
      const hit = hitTest(pointsRef.current);
      setStrokes((s) => [...s.slice(-3), { points: [...pointsRef.current] }]);
      if (hit != null) choose(hit);
    }
    pointsRef.current = null;
    setDraft(null);
  };

  const loopPoints = (pts) =>
    pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ") + " Z";

  return (
    <div>
      <h2 className="text-center font-heading text-xl font-semibold text-slate-800 sm:text-2xl">
        {practice.question}
      </h2>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <PenLine className="h-3.5 w-3.5" />
        Tap or circle your answer.
      </p>

      <div
        ref={boardRef}
        data-testid="quiz-board"
        className="relative mt-8 grid touch-none select-none gap-4 sm:grid-cols-3"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={finishStroke}
      >
        {practice.choices.map((choice, i) => {
          const wasWrong = wrong.includes(i);
          const isRight = correct && i === practice.correct_index;
          return (
            <button
              key={i}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              data-testid="quiz-choice"
              type="button"
              onClick={() => choose(i)}
              className={`flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition-colors ${
                isRight
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : wasWrong
                    ? "border-red-200 bg-red-50 text-red-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                  isRight
                    ? "border-emerald-400 text-emerald-600"
                    : wasWrong
                      ? "border-red-200 text-red-300"
                      : "border-slate-300 text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`whitespace-normal break-words text-center text-sm leading-relaxed ${
                  wasWrong && !isRight ? "line-through" : ""
                }`}
              >
                {choice}
              </span>
            </button>
          );
        })}

        {/* drawn loops: the circle the student drew over an object */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {strokes.map((s, i) => (
            <path key={`s${i}`} d={loopPoints(s.points)} fill="none" stroke="#38bdf8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {draft && (
            <path d={loopPoints(draft)} fill="none" stroke="#38bdf8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>

      <div className="mt-6 flex min-h-[32px] items-center justify-center">
        {!correct && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-slate-400"
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
        )}
      </div>
      {showHint && !correct && practice.hint && (
        <p className="mt-2 text-center text-sm text-slate-500">{practice.hint}</p>
      )}
      {correct && (
        <p
          data-testid="quiz-correct"
          className={`mt-2 rounded-xl bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-700 ${reducedMotion ? "" : "transition-opacity"}`}
        >
          {practice.explanation || "Nice work."}
        </p>
      )}
    </div>
  );
}