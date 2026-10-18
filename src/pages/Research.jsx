import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import UploadCard from "@/components/research/UploadCard";
import ResearchHistory from "@/components/research/ResearchHistory";
import MermaidDiagram from "@/components/research/MermaidDiagram";
import NodeDetail from "@/components/research/NodeDetail";
import ResearchPresentation from "@/components/research/ResearchPresentation";
import { loadResearchSessions, saveResearchSession } from "@/lib/researchSessionStore";
import {
  RESEARCH_TOOLS,
  researchStudentContext,
  researchProfessorInstructions
} from "@/lib/researchSession";
import { Button } from "@/components/ui/button";

// cyber8Research: the second student route. A student uploads class material,
// it becomes a source-grounded lesson with a clickable Mermaid diagram. The
// professor is optional: students can read, quiz themselves, or ask to hear
// a topic presented. Completed work is saved to the research history,
// separately from the live tutor sessions.
export default function Research() {
  const [phase, setPhase] = useState("upload"); // upload | study
  const [busy, setBusy] = useState(false);
  const [busyStep, setBusyStep] = useState(0);
  const [error, setError] = useState(null);
  const [doc, setDoc] = useState(null);
  const [map, setMap] = useState(null);
  const [sessions, setSessions] = useState(() => loadResearchSessions());
  const [selectedId, setSelectedId] = useState(null);
  const [studied, setStudied] = useState([]);
  const [quizLog, setQuizLog] = useState({});
  const [presenting, setPresenting] = useState(false);
  const [segments, setSegments] = useState(null);
  const [segIndex, setSegIndex] = useState(null);

  const voice = useRealtimeVoice();

  const mapRef = useRef(null);
  const docRef = useRef(null);
  const selectedRef = useRef(null);
  const segsRef = useRef(null);
  const presentingRef = useRef(false);
  const nudgedRef = useRef(false);
  const sessionIdRef = useRef(null);

  const isVoiceActive = () => ["listening", "thinking", "speaking"].includes(voice.status);

  useEffect(() => {
    presentingRef.current = presenting;
  }, [presenting]);

  // --- From the document to the diagram ---
  const startResearch = async (file) => {
    setError(null);
    setBusy(true);
    setBusyStep(0);
    try {
      // (stored privately)
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      if (!file_uri) throw new Error("The document could not be uploaded.");
      setBusyStep(1);
      const ex = await base44.functions.invoke("extractDocument", { file_uri, fileName: file.name });
      const document = ex?.data?.document;
      if (!document) throw new Error(ex?.data?.error || "The document could not be read.");
      setBusyStep(2);
      const mapRes = await base44.functions.invoke("buildResearchMap", {
        title: document.title,
        text: document.fullText
      });
      const m = mapRes?.data?.map;
      if (!m) throw new Error(mapRes?.data?.error || "The lesson diagram could not be built.");

      docRef.current = { title: document.title, fileName: file.name, text: document.fullText };
      setDoc(docRef.current);
      mapRef.current = m;
      setMap(m);
      sessionIdRef.current = String(Date.now());
      setSelectedId(null);
      selectedRef.current = null;
      setStudied([]);
      setQuizLog({});
      setSegments(null);
      segsRef.current = null;
      setSegIndex(null);
      setPresenting(false);
      setPhase("study");
    } catch (err) {
      setError(err?.message || "I could not build a lesson from this document.");
    }
    setBusy(false);
  };

  const openSaved = (session) => {
    voice.stop();
    const m = session.map;
    if (!m) return;
    mapRef.current = m;
    setMap(m);
    docRef.current = { title: m.title, fileName: session.fileName ?? "", text: "" };
    setDoc(docRef.current);
    sessionIdRef.current = session.id;
    setSelectedId(null);
    selectedRef.current = null;
    setStudied(session.studiedNodes ?? []);
    setQuizLog(session.quizLog ?? {});
    setSegments(null);
    segsRef.current = null;
    setSegIndex(null);
    setPresenting(false);
    setPhase("study");
  };

  const newDocument = () => {
    voice.stop();
    setMap(null);
    mapRef.current = null;
    setDoc(null);
    docRef.current = null;
    setSelectedId(null);
    selectedRef.current = null;
    setStudied([]);
    setQuizLog({});
    setSegments(null);
    segsRef.current = null;
    setSegIndex(null);
    setPresenting(false);
    setSessions(loadResearchSessions());
    setPhase("upload");
  };

  // --- The optional professor: present one topic, then answer questions ---
  const handleToolCall = async ({ name, arguments: args, call_id }) => {
    if (name === "show_segment") {
      const segs = segsRef.current ?? [];
      const i = Math.min(Math.max(Number(args?.segment_index) || 0, 0), Math.max(segs.length - 1, 0));
      const seg = segs[i];
      setSegIndex(i);
      if (!seg) {
        voice.sendFunctionCallOutput(call_id, "There is nothing to show for this part. Continue explaining calmly.");
        return;
      }
      const last = i === segs.length - 1;
      if (seg.spokenText) {
        voice.sendFunctionCallOutput(
          call_id,
          last
            ? `Picture ${i + 1} of ${segs.length} is on screen: ${seg.idea}. Say exactly this: "${seg.spokenText}" Then say one short closing sentence about the topic, call finish_presentation, and wait.`
            : `Picture ${i + 1} of ${segs.length} is on screen: ${seg.idea}. Say exactly this: "${seg.spokenText}" As you finish speaking, call show_segment(${i + 1}). Keep a steady pace, no pause, no questions.`
        );
      } else {
        voice.sendFunctionCallOutput(
          call_id,
          `There is no picture for this part. Explain "${seg.idea}" in your own words in two or three short sentences. ${
            last ? "Then say one short closing sentence, call finish_presentation, and wait." : `As you finish, call show_segment(${i + 1}).`
          }`
        );
      }
    } else if (name === "finish_presentation") {
      setPresenting(false);
      setSegIndex(null);
      voice.sendFunctionCallOutput(
        call_id,
        "The full diagram is back on the student's screen. Tell them in one short sentence that they can explore other topics or ask you a question, then wait."
      );
    }
  };

  const presentNode = async (node) => {
    if (!node) return;
    setSelectedId(node.id);
    selectedRef.current = node.id;
    setStudied((s) => (s.includes(node.id) ? s : [...s, node.id]));
    setPresenting(true);
    setSegments(null);
    segsRef.current = null;
    setSegIndex(null);
    nudgedRef.current = false;
    try {
      const res = await base44.functions.invoke("buildResearchPresentation", {
        docTitle: mapRef.current?.title ?? "",
        nodeLabel: node.label,
        nodeExplanation: node.explanation,
        excerpt: node.excerpt ?? ""
      });
      const segs = res?.data?.presentation?.segments;
      segsRef.current = Array.isArray(segs) && segs.length ? segs : [{ idea: node.label, spokenText: null, url: null }];
    } catch (err) {
      segsRef.current = [{ idea: node.label, spokenText: null, url: null }];
    }
    setSegments(segsRef.current);
    // Connect the professor while the pictures are still being prepared, so
    // the connection time is never felt. The professor stays silent until
    // the scene is ready.
    if (isVoiceActive()) {
      voice.updateSession(researchProfessorInstructions(mapRef.current, node), RESEARCH_TOOLS);
    } else {
      voice.start(researchStudentContext(mapRef.current, node), {
        instructions: researchProfessorInstructions(mapRef.current, node),
        tools: RESEARCH_TOOLS,
        onToolCall: handleToolCall
      });
    }
  };

  const stopPresentation = () => {
    voice.stop();
    setPresenting(false);
    setSegIndex(null);
  };

  const reconnectVoice = () => {
    const node = mapRef.current?.nodes.find((n) => n.id === selectedRef.current);
    if (!node) return;
    nudgedRef.current = false;
    voice.start(researchStudentContext(mapRef.current, node), {
      instructions: researchProfessorInstructions(mapRef.current, node),
      tools: RESEARCH_TOOLS,
      onToolCall: handleToolCall
    });
  };

  // Once the professor is listening AND the pictures are ready, cue the
  // presentation. Never before: the professor stays silent during prep.
  useEffect(() => {
    if (phase !== "study" || !presenting || voice.status !== "listening") return;
    if (!segsRef.current || nudgedRef.current) return;
    nudgedRef.current = true;
    voice.requestResponse(
      "(Say nothing first: call show_segment(0) immediately, then speak exactly the text the tool result gives you.)"
    );
  }, [voice.status, presenting, segments, phase]);

  const selectNode = (id) => {
    setSelectedId(id);
    selectedRef.current = id;
    const node = mapRef.current?.nodes.find((n) => n.id === id);
    if (node && isVoiceActive() && !presentingRef.current) {
      voice.updateSession(researchProfessorInstructions(mapRef.current, node), RESEARCH_TOOLS);
    }
  };

  const askProfessor = (text) => {
    if (text) voice.tellTutor(text);
  };

  const handleQuizResult = (nodeId, entry) => {
    setQuizLog((prev) => ({ ...prev, [nodeId]: entry }));
  };

  // --- Quietly save the session for review (research history) ---
  useEffect(() => {
    if (!map) return;
    if (!sessionIdRef.current) sessionIdRef.current = String(Date.now());
    saveResearchSession({
      id: sessionIdRef.current,
      savedAt: Date.now(),
      docTitle: docRef.current?.title ?? map.title,
      fileName: docRef.current?.fileName ?? "",
      map,
      studiedNodes: studied,
      quizLog
    });
  }, [map, studied, quizLog]);

  // --- Screens ---
  if (phase === "upload") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="font-heading text-3xl font-semibold text-slate-800">cyber8Research</h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload your class material. It becomes an animated lesson with a clickable diagram, explanations and quizzes.
            </p>
          </div>
          <UploadCard onStart={startResearch} busy={busy} busyStep={busyStep} error={error} />
          <ResearchHistory sessions={sessions} onOpen={openSaved} />
        </div>
      </div>
    );
  }

  const selectedNode = map?.nodes.find((n) => n.id === selectedId);
  const segment = segments && segIndex != null ? segments[segIndex] : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-slate-800">{map.title}</h1>
            <p className="text-xs text-slate-400">
              {doc?.fileName ? `From ${doc.fileName} · ` : ""}tap any topic in the diagram
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={newDocument}>
            Study another document
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6" data-testid="summary-card">
          <h2 className="font-medium text-slate-800">Key summary</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{map.summary}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <p className="mb-3 text-sm font-medium text-slate-800">Lesson diagram</p>
          <MermaidDiagram chart={map.mermaid} selectedId={selectedId} onSelect={selectNode} />
        </div>

        {!selectedNode && (
          <p className="text-center text-sm text-slate-400" data-testid="select-hint">
            Tap a topic in the diagram to see its explanation and a short quiz.
          </p>
        )}

        <NodeDetail
          node={selectedNode}
          voiceActive={isVoiceActive()}
          presenting={presenting}
          onPresent={presentNode}
          onStopProfessor={() => voice.stop()}
          onAsk={askProfessor}
          onQuizResult={handleQuizResult}
        />
      </div>

      {presenting && (
        <ResearchPresentation
          node={selectedNode}
          segment={segment}
          voiceStatus={voice.status}
          onRetryVoice={reconnectVoice}
          onStop={stopPresentation}
        />
      )}
    </div>
  );
}