import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import ListeningOverlay from "@/components/safeSteps/ListeningOverlay";
import TutorHome from "@/components/livetutor/TutorHome";
import KnowledgeMapCanvas from "@/components/livetutor/KnowledgeMapCanvas";
import NodePanel from "@/components/livetutor/NodePanel";
import EvidenceBar from "@/components/livetutor/EvidenceBar";
import StatusPill from "@/components/livetutor/StatusPill";
import ImageHelpOverlay from "@/components/livetutor/ImageHelpOverlay";
import WrapUpCard from "@/components/livetutor/WrapUpCard";
import {
  START_TOPIC_TOOL,
  MOVE_NODE_TOOL,
  openQuestionInstructions,
  teachingInstructions,
  profileContext
} from "@/lib/liveTutorSession";

// cyber8LiveTutor: personalized home -> open spoken question -> a concept
// map the tutor teaches node by node with live two-way voice.
export default function LiveTutor() {
  const [phase, setPhase] = useState("home"); // home | asking | teaching | wrapup
  const [profile, setProfile] = useState(null);
  const [map, setMap] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [doneNodes, setDoneNodes] = useState([]);
  const [practiceLog, setPracticeLog] = useState({});
  const [helpImage, setHelpImage] = useState(null); // {state, url, label}
  const [buildingMap, setBuildingMap] = useState(false);
  const [homeError, setHomeError] = useState(null);

  const voice = useRealtimeVoice();

  // Latest-value refs for the realtime tool-call handler, which is captured
  // once per session but always needs the current state.
  const mapRef = useRef(null);
  const activeRef = useRef(null);
  const profileRef = useRef(null);
  const practiceRef = useRef({});
  const buildingRef = useRef(false);
  useEffect(() => {
    mapRef.current = map;
  }, [map]);
  useEffect(() => {
    activeRef.current = activeNodeId;
  }, [activeNodeId]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const buildMap = async (question) => {
    const p = profileRef.current;
    const res = await base44.functions.invoke("buildTopicMap", {
      question,
      subject: p?.subject ?? "",
      ageRange: p?.ageRange ?? "",
      goal: p?.goal ?? "",
      preferences: Object.entries(p ?? {})
        .filter(([, v]) => v === true)
        .map(([k]) => k)
    });
    const data = res?.data ?? {};
    if (!data.map) throw new Error(data.error || "map");
    return data.map;
  };

  const markDone = (id) => {
    if (!id) return;
    setDoneNodes((d) => (d.includes(id) ? d : [...d, id]));
  };

  // --- Realtime tool calls from the tutor ---
  const handleToolCall = async ({ name, arguments: args, call_id }) => {
    if (name === "start_topic") {
      if (mapRef.current || buildingRef.current) {
        voice.sendFunctionCallOutput(call_id, "The learning map is already on screen.");
        return;
      }
      buildingRef.current = true;
      setBuildingMap(true);
      try {
        const m = await buildMap(String(args?.question ?? ""));
        const first = m.nodes[0].id;
        setMap(m);
        mapRef.current = m;
        setActiveNodeId(first);
        activeRef.current = first;
        setPhase("teaching");
        voice.updateSession(
          teachingInstructions(m, first, practiceRef.current, profileRef.current),
          [MOVE_NODE_TOOL]
        );
        voice.sendFunctionCallOutput(
          call_id,
          "The learning map is on screen. Begin teaching the first node now."
        );
      } catch (err) {
        voice.sendFunctionCallOutput(
          call_id,
          "The map could not be built. Ask the student to say their question again in a different way."
        );
      }
      buildingRef.current = false;
      setBuildingMap(false);
    } else if (name === "move_to_node") {
      const m = mapRef.current;
      if (!m) return;
      if (args?.node_id === "wrap_up") {
        markDone(activeRef.current);
        setDoneNodes(m.nodes.map((n) => n.id));
        setPhase("wrapup");
        voice.sendFunctionCallOutput(call_id, "The lesson is wrapping up on screen. Close it warmly now.");
        return;
      }
      const node = m.nodes.find((n) => n.id === args?.node_id);
      if (!node) {
        voice.sendFunctionCallOutput(call_id, "That node is not on the map. Pick another one.");
        return;
      }
      markDone(activeRef.current);
      setActiveNodeId(node.id);
      activeRef.current = node.id;
      voice.updateSession(
        teachingInstructions(m, node.id, practiceRef.current, profileRef.current),
        [MOVE_NODE_TOOL]
      );
      voice.sendFunctionCallOutput(call_id, "The screen is now on this node. Begin teaching it.");
    }
  };

  // --- Session lifecycle ---
  const startSession = async (p, typedQuestion) => {
    setProfile(p);
    profileRef.current = p;
    setMap(null);
    mapRef.current = null;
    setActiveNodeId(null);
    activeRef.current = null;
    setDoneNodes([]);
    setPracticeLog({});
    practiceRef.current = {};
    setHelpImage(null);
    setHomeError(null);
    buildingRef.current = false;

    const question = (typedQuestion ?? "").trim();
    if (question) {
      // Typed question: build the map first, then the tutor teaches it live.
      buildingRef.current = true;
      setBuildingMap(true);
      try {
        const m = await buildMap(question);
        const first = m.nodes[0].id;
        setMap(m);
        mapRef.current = m;
        setActiveNodeId(first);
        activeRef.current = first;
        setPhase("teaching");
        voice.start(profileContext(p), {
          instructions: teachingInstructions(m, first, {}, p),
          tools: [MOVE_NODE_TOOL],
          onToolCall: handleToolCall
        });
      } catch (err) {
        setHomeError("I could not build a map for that question. Try rephrasing it.");
        setPhase("home");
      }
      buildingRef.current = false;
      setBuildingMap(false);
    } else {
      // Voice-first: the tutor greets, listens, and identifies the topic.
      setPhase("asking");
      voice.start(profileContext(p), {
        instructions: openQuestionInstructions(p),
        tools: [START_TOPIC_TOOL],
        onToolCall: handleToolCall
      });
    }
  };

  const reconnectVoice = () => {
    const p = profileRef.current;
    if (mapRef.current && activeRef.current) {
      voice.start(profileContext(p), {
        instructions: teachingInstructions(mapRef.current, activeRef.current, practiceRef.current, p),
        tools: [MOVE_NODE_TOOL],
        onToolCall: handleToolCall
      });
    } else if (p) {
      voice.start(profileContext(p), {
        instructions: openQuestionInstructions(p),
        tools: [START_TOPIC_TOOL],
        onToolCall: handleToolCall
      });
    }
  };

  const endSession = () => {
    voice.stop();
    setPhase("home");
    setMap(null);
    mapRef.current = null;
    setActiveNodeId(null);
    activeRef.current = null;
    setDoneNodes([]);
    setPracticeLog({});
    practiceRef.current = {};
    setHelpImage(null);
  };

  // --- Node advance from the student's own buttons ---
  const advanceFromUi = (reason) => {
    const m = mapRef.current;
    if (!m || !activeRef.current) return;
    const idx = m.nodes.findIndex((n) => n.id === activeRef.current);
    const next = m.nodes[idx + 1];
    markDone(activeRef.current);
    if (!next) {
      setDoneNodes(m.nodes.map((n) => n.id));
      setPhase("wrapup");
      voice.tellTutor("(The student finished the map. Please wrap up the lesson warmly.)");
      return;
    }
    setActiveNodeId(next.id);
    activeRef.current = next.id;
    voice.updateSession(
      teachingInstructions(m, next.id, practiceRef.current, profileRef.current),
      [MOVE_NODE_TOOL]
    );
    voice.tellTutor(
      `(The student pressed ${reason} on the previous node. Start teaching "${next.label}" now.)`
    );
  };

  const askNewQuestion = () => {
    const p = profileRef.current;
    setMap(null);
    mapRef.current = null;
    setActiveNodeId(null);
    activeRef.current = null;
    setDoneNodes([]);
    setPracticeLog({});
    practiceRef.current = {};
    setHelpImage(null);
    setPhase("asking");
    voice.updateSession(openQuestionInstructions(p), [START_TOPIC_TOOL]);
    voice.requestResponse("Ask the student what they would like to learn next, then wait.");
  };

  // --- Practice tracking ---
  const handleAttempt = (nodeId, entry) => {
    setPracticeLog((prev) => {
      const next = { ...prev, [nodeId]: { ...prev[nodeId], ...entry } };
      practiceRef.current = next;
      return next;
    });
    const node = mapRef.current?.nodes.find((n) => n.id === nodeId);
    if (entry.correct && node) {
      voice.tellTutor(
        `(Practice result on "${node.label}": the student answered correctly after ${entry.attempts} attempt(s)${entry.hints ? ` with ${entry.hints} hint(s)` : ""}.)`
      );
    }
  };

  const handleStuck = (nodeId) => {
    const node = mapRef.current?.nodes.find((n) => n.id === nodeId);
    if (node) {
      voice.tellTutor(
        `(The student is stuck on the practice for "${node.label}". Simplify the explanation and give one concrete everyday example.)`
      );
    }
    requestHelpImage();
  };

  // --- Picture help (generated in the background, audio keeps running) ---
  const requestHelpImage = async () => {
    const m = mapRef.current;
    const node = m?.nodes.find((n) => n.id === activeRef.current);
    if (!node) return;
    setHelpImage({ state: "loading", label: node.label });
    try {
      const res = await base44.functions.invoke("generateHelpImage", {
        nodeLabel: node.label,
        nodeDescription: node.description,
        question: m.title,
        ageRange: profileRef.current?.ageRange ?? ""
      });
      const url = res?.data?.url;
      setHelpImage(url ? { state: "ready", url, label: node.label } : { state: "error", label: node.label });
    } catch (err) {
      setHelpImage({ state: "error", label: node.label });
    }
  };

  // --- Screens ---
  if (phase === "home") {
    return <TutorHome onStart={startSession} error={homeError} busy={buildingMap} />;
  }

  if (phase === "asking") {
    return (
      <div className="min-h-screen bg-white">
        <ListeningOverlay
          status={voice.status}
          userText={voice.userTranscript}
          tutorText={voice.tutorText}
          error={voice.error}
          onRetry={() => startSession(profileRef.current, null)}
          onEnd={endSession}
        />
      </div>
    );
  }

  const activeNode = map?.nodes.find((n) => n.id === activeNodeId);
  const nodeIndex = map ? map.nodes.findIndex((n) => n.id === activeNodeId) + 1 : 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="font-heading text-lg font-semibold text-slate-800">cyber8LiveTutor</h1>
          <p className="text-xs text-slate-500">
            {map ? `Node ${nodeIndex} of ${map.nodes.length}` : "Preparing your learning map"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusPill status={voice.status} onRetry={reconnectVoice} />
          <Button variant="outline" size="sm" onClick={endSession}>
            End session
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row">
        <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {map && (
            <KnowledgeMapCanvas
              map={map}
              activeNodeId={activeNodeId}
              doneNodes={doneNodes}
              reducedMotion={profile?.reducedMotion}
            />
          )}
          {!map && (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Putting your learning map on the screen...
            </div>
          )}
          {helpImage && (
            <ImageHelpOverlay
              state={helpImage.state}
              url={helpImage.url}
              label={helpImage.label}
              onDismiss={() => setHelpImage(null)}
              onRetry={requestHelpImage}
            />
          )}
          {phase === "wrapup" && (
            <WrapUpCard
              map={map}
              practiceLog={practiceLog}
              onNewQuestion={askNewQuestion}
              onEnd={endSession}
            />
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-4 lg:w-[35%]">
          <NodePanel
            node={activeNode}
            building={buildingMap}
            onAttempt={handleAttempt}
            onStuck={handleStuck}
            onHelpImage={requestHelpImage}
            onMoveOn={() => advanceFromUi("move on")}
            onSkip={() => advanceFromUi("skip")}
          />
          <EvidenceBar evidence={map?.evidence} />
          {profile?.captions && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Captions</p>
              {voice.userTranscript && (
                <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  You said: {voice.userTranscript}
                </p>
              )}
              {voice.tutorText && (
                <p aria-live="polite" className="rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-700">
                  {voice.tutorText}
                </p>
              )}
              {!voice.userTranscript && !voice.tutorText && (
                <p className="text-sm text-slate-400">Nothing spoken yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}