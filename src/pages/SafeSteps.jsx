import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import * as L from "@/lib/safeStepsLogic";
import { base44 } from "@/api/base44Client";
import TopBar from "@/components/safeSteps/TopBar";
import StepSidebar from "@/components/safeSteps/StepSidebar";
import TeacherPanel from "@/components/safeSteps/TeacherPanel";
import StepArea from "@/components/safeSteps/StepArea";
import EvidencePanel from "@/components/safeSteps/EvidencePanel";
import AskTeacher from "@/components/safeSteps/AskTeacher";
import BreakOverlay from "@/components/safeSteps/BreakOverlay";
import WhyThisWorks from "@/components/safeSteps/WhyThisWorks";

const TUTOR_ACTIONS = new Set(["STROKES", "TAP", "HINT", "QUIZ_ANSWER", "ASK"]);
const ALLOWED_EVIDENCE = ["F1", "F2", "F3", "F4", "F5", "stat", null];

function isValidTutorReply(reply) {
  if (!reply || !Array.isArray(reply.lines) || reply.lines.length === 0 || reply.lines.length > 2) return false;
  const text = reply.lines.join(" ");
  if (!text.trim()) return false;
  if (/wrong/i.test(text)) return false;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 2) return false;
  if (!ALLOWED_EVIDENCE.includes(reply.show_evidence)) return false;
  return true;
}

export default function SafeSteps() {
  const [state, dispatch] = useReducer(L.reducer, undefined, L.initialState);
  const [calm, setCalm] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [tutorOn, setTutorOn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [tour, setTour] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [aiLines, setAiLines] = useState(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Session timer: runs unless the lesson is paused.
  useEffect(() => {
    const t = setInterval(() => {
      if (!state.paused) setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [state.paused]);

  // AI tutor: reword the scripted reply. The reducer decides correctness; the AI only chooses wording.
  const tutorToken = useRef(0);
  const runTutor = useCallback(async (action, cur, next) => {
    const token = ++tutorToken.current;
    const missed = L.FLAG_IDS.filter((id) => !next.found.includes(id) && !next.revealed.includes(id));
    let scenario = null;
    if (action.type === "QUIZ_ANSWER" && next.quiz.phase === "question") {
      const sc = L.SCENARIOS[next.quiz.index];
      scenario = { context: sc.context, message: sc.message };
    }
    const payload = {
      action: action.type,
      scripted_lines: next.say.lines,
      found: next.found,
      revealed: next.revealed,
      missed,
      scenario,
      answer: action.type === "QUIZ_ANSWER" ? action.choice : null,
      question: action.type === "ASK" ? action.question : null,
      flags: L.FLAGS.map((f) => ({ id: f.id, text: f.text, hint: f.hint, why: f.why, claim: f.claim })),
    };
    try {
      const res = await Promise.race([
        base44.functions.invoke("safeStepsTutor", payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error("tutor timeout")), 3000)),
      ]);
      if (tutorToken.current !== token) return;
      const reply = res && res.data ? res.data : res;
      if (!isValidTutorReply(reply)) return;
      setAiLines({ sayId: next.say.id, lines: reply.lines, nonce: token });
      if (reply.show_evidence) dispatch({ type: "SHOW_EVIDENCE", id: reply.show_evidence });
    } catch (err) {
      // Keep the scripted lines.
    }
  }, []);

  const send = useCallback(
    (action) => {
      const cur = stateRef.current;
      const next = L.reducer(cur, action);
      stateRef.current = next;
      dispatch(action);
      if (action.type === "RESET") {
        setSeconds(0);
        setTour(false);
        setAiLines(null);
      }
      if (tutorOn && TUTOR_ACTIONS.has(action.type) && !next.paused && next.say.id !== cur.say.id) {
        runTutor(action, cur, next);
      }
    },
    [tutorOn, runTutor]
  );

  // Quick tour: voice off, advance every 9 seconds until step 6.
  useEffect(() => {
    if (!tour) return;
    if (state.step >= 6) {
      setTour(false);
      return;
    }
    const t = setTimeout(() => send({ type: "GO_STEP", step: state.step + 1 }), 9000);
    return () => clearTimeout(t);
  }, [tour, state.step, send]);

  const quickTour = () => {
    send({ type: "RESET" });
    send({ type: "FILL_ALL" });
    send({ type: "GO_STEP", step: 2 });
    setTour(true);
  };

  const hasAi = aiLines && aiLines.sayId === state.say.id;
  const captions = hasAi ? aiLines.lines : state.say.lines;
  const speechKey = `${state.say.id}|${hasAi ? aiLines.nonce : 0}`;

  return (
    <div className={`min-h-screen bg-slate-50 ${calm ? "ss-calm" : ""}`}>
      <TopBar
        state={state}
        seconds={seconds}
        calm={calm}
        voiceOn={voiceOn}
        tutorOn={tutorOn}
        onCalm={setCalm}
        onVoice={setVoiceOn}
        onTutor={setTutorOn}
        onPause={() => send({ type: "PAUSE" })}
        onWhy={() => setWhyOpen(true)}
        onReset={() => send({ type: "RESET" })}
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[190px_minmax(0,1fr)_330px]">
        <StepSidebar state={state} onGo={(step) => send({ type: "GO_STEP", step })} />
        <div className="min-w-0">
          <TeacherPanel lines={captions} speechKey={speechKey} voiceOn={voiceOn && !tour} />
          <StepArea state={state} calm={calm} send={send} onQuickTour={quickTour} />
          {state.step >= 3 && <AskTeacher send={send} />}
        </div>
        <EvidencePanel state={state} send={send} />
      </div>
      <BreakOverlay paused={state.paused} onResume={() => send({ type: "RESUME" })} />
      <WhyThisWorks open={whyOpen} onOpenChange={setWhyOpen} />
    </div>
  );
}