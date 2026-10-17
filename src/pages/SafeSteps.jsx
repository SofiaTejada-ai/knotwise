import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import * as L from "@/lib/safeStepsLogic";
import { base44 } from "@/api/base44Client";
import TopBar from "@/components/safeSteps/TopBar";
import StepSidebar from "@/components/safeSteps/StepSidebar";
import TutorRoom from "@/components/safeSteps/TutorRoom";
import StepArea from "@/components/safeSteps/StepArea";
import EvidencePanel from "@/components/safeSteps/EvidencePanel";
import AskTeacher from "@/components/safeSteps/AskTeacher";
import BreakOverlay from "@/components/safeSteps/BreakOverlay";
import WhyThisWorks from "@/components/safeSteps/WhyThisWorks";
import MessageToolbar from "@/components/safeSteps/MessageToolbar";
import ZoomNodes from "@/components/safeSteps/ZoomNodes";
import ListeningOverlay from "@/components/safeSteps/ListeningOverlay";
import { createVoiceConnection } from "@/hooks/useVoiceConnection";

const TUTOR_EVENTS = new Set(["STROKES", "TAP", "HINT", "QUIZ_ANSWER", "ASK"]);
const ALLOWED_EVIDENCE = ["F1", "F2", "F3", "F4", "F5", "stat"];

function parseTutorReply(content) {
  if (typeof content !== "string" || !content.trim()) return null;
  try {
    return JSON.parse(content);
  } catch (err) {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch (err2) {
        return null;
      }
    }
    return null;
  }
}

function isValidTutorReply(reply) {
  if (!reply || !Array.isArray(reply.lines) || reply.lines.length === 0 || reply.lines.length > 2) return false;
  const text = reply.lines.join(" ");
  if (!text.trim()) return false;
  if (/wrong/i.test(text)) return false;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 2) return false;
  const ev = reply.evidence ?? null;
  if (ev !== null && !ALLOWED_EVIDENCE.includes(ev)) return false;
  if (reply.hint !== undefined && typeof reply.hint !== "boolean") return false;
  return true;
}

export default function SafeSteps() {
  const [state, dispatch] = useReducer(L.reducer, undefined, L.initialState);
  const [calm, setCalm] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [tour, setTour] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [roomState, setRoomState] = useState("idle"); // idle | listening | thinking | speaking
  const [agentLines, setAgentLines] = useState(null);
  const [voiceNotice, setVoiceNotice] = useState(null);

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

  // Tutor room state timers.
  const speakTimer = useRef(null);
  const thinkTimer = useRef(null);
  const showSpeaking = useCallback(() => {
    setRoomState((rs) => (rs === "listening" ? rs : "speaking"));
    clearTimeout(speakTimer.current);
    speakTimer.current = setTimeout(() => setRoomState((rs) => (rs === "listening" ? rs : "idle")), 5000);
  }, []);

  // ---- Tutor agent: wording, approved hint/evidence requests only ----
  const convRef = useRef(null);
  const pendingEvent = useRef(null);
  const appliedReply = useRef(null);
  const agentToken = useRef(0);

  const applyAgentReply = useCallback(
    (reply) => {
      if (!isValidTutorReply(reply)) return;
      const pend = pendingEvent.current;
      if (!pend) return;
      if (reply.event_id && reply.event_id !== pend.id) return;
      if (appliedReply.current === pend.id) return;
      appliedReply.current = pend.id;
      setAgentLines({ sayId: pend.sayId, lines: reply.lines });
      if (reply.hint === true) dispatch({ type: "HINT" });
      else if (reply.evidence) dispatch({ type: "SHOW_EVIDENCE", id: reply.evidence });
      clearTimeout(thinkTimer.current);
      showSpeaking();
    },
    [showSpeaking]
  );

  const ensureConversation = useCallback(async () => {
    if (convRef.current) return convRef.current;
    const conv = await base44.agents.createConversation({
      agent_name: "SafeStepsTutor",
      metadata: { name: "Safe Steps lesson" },
    });
    convRef.current = conv;
    base44.agents.subscribeToConversation(conv.id, (data) => {
      const msgs = data?.messages ?? [];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          const reply = parseTutorReply(msgs[i].content);
          if (reply) {
            applyAgentReply(reply);
            return;
          }
        }
      }
    });
    return conv;
  }, [applyAgentReply]);

  const sendEventToAgent = useCallback(
    async (action, next) => {
      agentToken.current += 1;
      const eventId = `E${agentToken.current}`;
      pendingEvent.current = { sayId: next.say.id, id: eventId };
      setVoiceNotice(null);
      setRoomState("thinking");
      clearTimeout(thinkTimer.current);
      thinkTimer.current = setTimeout(() => showSpeaking(), 7000);
      const missed = L.FLAG_IDS.filter((id) => !next.found.includes(id) && !next.revealed.includes(id));
      let scenario = null;
      if (action.type === "QUIZ_ANSWER" && next.quiz.phase === "question") {
        const sc = L.SCENARIOS[next.quiz.index];
        scenario = { context: sc.context, message: sc.message };
      }
      const event = {
        event_id: eventId,
        event: action.type,
        tapped_phrase_id: action.type === "TAP" ? action.id : null,
        student_question: action.type === "ASK" ? action.question : null,
        quiz_answer: action.type === "QUIZ_ANSWER" ? action.choice : null,
        scripted_reply: next.say.lines,
        flags_found: next.found,
        flags_revealed: next.revealed,
        flags_missed: missed,
        quiz_scenario: scenario,
        flag_data: L.FLAGS.map((f) => ({ id: f.id, text: f.text, hint: f.hint, why: f.why, claim: f.claim })),
      };
      try {
        const conv = await ensureConversation();
        await base44.agents.addMessage(conv, { role: "user", content: JSON.stringify(event) });
      } catch (err) {
        clearTimeout(thinkTimer.current);
        showSpeaking();
      }
    },
    [ensureConversation, showSpeaking]
  );

  const send = useCallback(
    (action) => {
      const cur = stateRef.current;
      const next = L.reducer(cur, action);
      stateRef.current = next;
      dispatch(action);
      if (action.type === "RESET") {
        setSeconds(0);
        setTour(false);
        setAgentLines(null);
        setZoomOpen(false);
      }
      if (TUTOR_EVENTS.has(action.type) && !next.paused && next.say.id !== cur.say.id) {
        sendEventToAgent(action, next);
      } else if (next.say.id !== cur.say.id) {
        showSpeaking();
      }
    },
    [sendEventToAgent, showSpeaking]
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

  // ---- Voice connection (integration point) ----
  const voiceRef = useRef(null);
  const startVoice = async () => {
    setVoiceNotice(null);
    if (!voiceRef.current) {
      voiceRef.current = createVoiceConnection({
        onTranscribed: (text) => send({ type: "ASK", question: text }),
        onError: (msg) => {
          setVoiceNotice(msg);
          showSpeaking();
        },
      });
    }
    try {
      await voiceRef.current.start();
      setRoomState("listening");
    } catch (err) {
      setVoiceNotice("Voice input is not connected yet. You can type your question instead.");
    }
  };
  const stopVoice = () => {
    voiceRef.current?.stop();
    setRoomState("thinking");
  };
  const cancelVoice = () => {
    voiceRef.current?.cancel();
    setRoomState("idle");
  };

  const hasAgent = agentLines && agentLines.sayId === state.say.id;
  const captions = hasAgent ? agentLines.lines : state.say.lines;

  return (
    <div className={`min-h-screen bg-slate-50 ${calm ? "ss-calm" : ""}`}>
      <TopBar
        state={state}
        seconds={seconds}
        calm={calm}
        onCalm={setCalm}
        onPause={() => send({ type: "PAUSE" })}
        onWhy={() => setWhyOpen(true)}
        onReset={() => send({ type: "RESET" })}
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[190px_minmax(0,1fr)_330px]">
        <StepSidebar state={state} onGo={(step) => send({ type: "GO_STEP", step })} />
        <div className="min-w-0">
          <TutorRoom roomState={roomState} lines={captions} voiceNotice={voiceNotice} onMicPress={startVoice} />
          {state.step >= 2 && state.step <= 5 && (
            <MessageToolbar zoom={zoom} onZoom={setZoom} onOpenNodes={() => setZoomOpen(true)} />
          )}
          <StepArea state={state} calm={calm} send={send} onQuickTour={quickTour} zoom={zoom} />
          {state.step >= 3 && <AskTeacher send={send} />}
        </div>
        <EvidencePanel state={state} send={send} />
      </div>
      {zoomOpen && (
        <ZoomNodes state={state} onClose={() => setZoomOpen(false)} onTap={(id) => send({ type: "TAP", id })} />
      )}
      {roomState === "listening" && <ListeningOverlay onStop={stopVoice} onCancel={cancelVoice} />}
      <BreakOverlay paused={state.paused} onResume={() => send({ type: "RESUME" })} />
      <WhyThisWorks open={whyOpen} onOpenChange={setWhyOpen} />
    </div>
  );
}