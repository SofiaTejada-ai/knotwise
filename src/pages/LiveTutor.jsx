import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import ListeningOverlay from "@/components/safeSteps/ListeningOverlay";
import TutorHome from "@/components/livetutor/TutorHome";
import QuietRoomCheck from "@/components/livetutor/QuietRoomCheck";
import LessonScene from "@/components/livetutor/LessonScene";
import WrapUpCard from "@/components/livetutor/WrapUpCard";
import { saveSession } from "@/lib/localSessionStore";
import {
  START_TOPIC_TOOL,
  SHOW_SEGMENT_TOOL,
  CONFIRM_UNDERSTANDING_TOOL,
  MOVE_NODE_TOOL,
  openQuestionInstructions,
  teachingInstructions,
  profileContext
} from "@/lib/liveTutorSession";

const TEACHING_TOOLS = [SHOW_SEGMENT_TOOL, CONFIRM_UNDERSTANDING_TOOL, MOVE_NODE_TOOL];

// cyber8LiveTutor: the student asks a question, the tutor plans the lesson
// length itself, then teaches topic by topic in one immersive scene. The
// tutor presents each topic with pictures that match each spoken idea, checks
// understanding by voice, runs an interactive quiz, and moves on. Notes and
// the session keep saving quietly in the background.
export default function LiveTutor() {
  const [phase, setPhase] = useState("home"); // home | ready | asking | teaching | wrapup
  const [pending, setPending] = useState(null); // { profile, typedQuestion }
  const [profile, setProfile] = useState(null);
  const [map, setMap] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [doneNodes, setDoneNodes] = useState([]);
  const [practiceLog, setPracticeLog] = useState({});
  const [buildingMap, setBuildingMap] = useState(false);
  const [homeError, setHomeError] = useState(null);
  const [notes, setNotes] = useState([]); // [{nodeId, label, text}]
  const [presentation, setPresentation] = useState(null); // segments of the active topic
  const [segIndex, setSegIndex] = useState(null); // segment being spoken / shown
  const [sceneMode, setSceneMode] = useState("prep"); // prep | present | quiz

  const voice = useRealtimeVoice();

  const mapRef = useRef(null);
  const activeRef = useRef(null);
  const profileRef = useRef(null);
  const practiceRef = useRef({});
  const buildingRef = useRef(false);
  const sessionIdRef = useRef(null);
  const exchangesRef = useRef({}); // raw conversation per node (Notes Agent input)
  const capturedRef = useRef({ user: "", tutor: "" });
  const notesBusyRef = useRef(false);
  const notesRef = useRef([]);
  const presentationRef = useRef(null);
  const sceneModeRef = useRef("prep");
  const segRef = useRef(null);
  const nudgedRef = useRef(false);
  useEffect(() => {
    sceneModeRef.current = sceneMode;
  }, [sceneMode]);
  useEffect(() => {
    segRef.current = segIndex;
  }, [segIndex]);
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

  // Build the presentation for a topic: spoken segments, each with its own
  // picture, all ready before the tutor starts presenting. On failure the
  // tutor explains the topic in their own words, honestly with no picture.
  const buildPresentation = async (node) => {
    try {
      const res = await base44.functions.invoke("buildNodePresentation", {
        nodeLabel: node.label,
        nodeDescription: node.description,
        nodeExample: node.example ?? "",
        question: mapRef.current?.title ?? "",
        ageRange: profileRef.current?.ageRange ?? ""
      });
      const segs = res?.data?.presentation?.segments;
      if (Array.isArray(segs) && segs.length) return segs;
    } catch (err) {
      // The lesson continues without pictures.
    }
    return [{ idea: node.label, spokenText: null, url: null }];
  };

  const openNode = (node) => {
    setActiveNodeId(node.id);
    activeRef.current = node.id;
    setPresentation(null);
    presentationRef.current = null;
    setSegIndex(null);
    setSceneMode("prep");
  };

  // --- Notes Agent (runs in the background, never interrupts the lesson) ---
  const runNotesAgent = async (node) => {
    if (!node || notesBusyRef.current) return;
    notesBusyRef.current = true;
    try {
      const exchange = (exchangesRef.current[node.id] || "").slice(-1200);
      const res = await base44.functions.invoke("writeLessonNotes", {
        question: mapRef.current?.title ?? "",
        nodeLabel: node.label,
        nodeDescription: node.description,
        exchange
      });
      const note = res?.data?.note;
      if (note) {
        setNotes((prev) => {
          const next = prev.filter((n) => n.nodeId !== node.id);
          next.push({ nodeId: node.id, label: node.label, text: note });
          notesRef.current = next;
          return next;
        });
      }
    } catch (err) {
      // Notes are best-effort: the live lesson always continues.
    }
    notesBusyRef.current = false;
  };

  // When a spoken exchange settles, save it for the node and let the Notes
  // Agent condense everything said so far into that node's note.
  useEffect(() => {
    if (phase !== "teaching") return;
    const timer = setTimeout(() => {
      const nodeId = activeRef.current;
      const node = mapRef.current?.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      let changed = false;
      let log = exchangesRef.current[nodeId] || "";
      if (voice.userTranscript && voice.userTranscript !== capturedRef.current.user) {
        log += ` Student said: ${voice.userTranscript}.`;
        capturedRef.current.user = voice.userTranscript;
        changed = true;
      }
      if (voice.tutorText && voice.tutorText !== capturedRef.current.tutor) {
        log += ` Tutor answered: ${voice.tutorText}.`;
        capturedRef.current.tutor = voice.tutorText;
        changed = true;
      }
      if (changed) {
        exchangesRef.current[nodeId] = log.slice(-1500);
        runNotesAgent(node);
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [voice.userTranscript, voice.tutorText, phase]);

  // Once the voice session is live, tell the tutor where the scene stands so
  // it begins (or resumes) the presentation. The request only goes out after
  // the connection is listening, so it is never dropped.
  const nudgeAfterConnect = () => {
    const m = mapRef.current;
    const node = m?.nodes.find((n) => n.id === activeRef.current);
    if (!m || !node) return;
    if (sceneModeRef.current === "quiz") {
      voice.requestResponse(
        `(Reconnected. The practice quiz is on screen for "${node.label}". Remind the student they can tap or circle their answer, then wait.)`
      );
    } else if (sceneModeRef.current === "present") {
      voice.requestResponse(
        `(Reconnected. The screen shows the picture for part ${(segRef.current ?? 0) + 1} of "${node.label}". If there are more parts, call show_segment with the next part number. If that was the last part, ask exactly: "Does that make sense?" and wait.)`
      );
    } else {
      voice.requestResponse(`Begin the topic "${node.label}" now: call show_segment(0).`);
    }
  };

  useEffect(() => {
    if (phase !== "teaching" || voice.status !== "listening") return;
    if (!mapRef.current) return;
    if (nudgedRef.current) return;
    nudgedRef.current = true;
    nudgeAfterConnect();
  }, [voice.status, phase]);

  const markDone = (id) => {
    if (!id) return;
    setDoneNodes((d) => (d.includes(id) ? d : [...d, id]));
    // If the node finishes before a spoken note was captured, still leave
    // the student a short note about the topic.
    if (!notesRef.current.some((n) => n.nodeId === id)) {
      const node = mapRef.current?.nodes.find((n) => n.id === id);
      if (node) runNotesAgent(node);
    }
  };

  // --- Realtime tool calls from the tutor ---
  const handleToolCall = async ({ name, arguments: args, call_id }) => {
    if (name === "start_topic") {
      if (mapRef.current || buildingRef.current) {
        voice.sendFunctionCallOutput(call_id, "The lesson is already on screen.");
        return;
      }
      buildingRef.current = true;
      setBuildingMap(true);
      try {
        const m = await buildMap(String(args?.question ?? ""));
        const first = m.nodes[0];
        setMap(m);
        mapRef.current = m;
        setPhase("teaching");
        openNode(first);
        voice.updateSession(
          teachingInstructions(m, first.id, practiceRef.current, profileRef.current),
          TEACHING_TOOLS
        );
        const segs = await buildPresentation(first);
        presentationRef.current = segs;
        setPresentation(segs);
        voice.sendFunctionCallOutput(
          call_id,
          `Your lesson "${m.title}" is on screen with ${m.nodes.length} topics. The screen shows the topic "${first.label}". Call show_segment(0) now to begin.`
        );
      } catch (err) {
        voice.sendFunctionCallOutput(
          call_id,
          "The lesson could not be built. Ask the student to say their question again in a different way."
        );
      }
      buildingRef.current = false;
      setBuildingMap(false);
    } else if (name === "show_segment") {
      const segs = presentationRef.current ?? [];
      const i = Math.min(Math.max(Number(args?.segment_index) || 0, 0), Math.max(segs.length - 1, 0));
      const seg = segs[i];
      setSegIndex(i);
      setSceneMode("present");
      if (!seg) {
        voice.sendFunctionCallOutput(call_id, "There is nothing to show for this part. Continue explaining calmly.");
        return;
      }
      const last = i === segs.length - 1;
      if (seg.spokenText) {
        voice.sendFunctionCallOutput(
          call_id,
          last
            ? `Picture ${i + 1} of ${segs.length} is on screen: ${seg.idea}. Say exactly this: "${seg.spokenText}" Then ask: "Does that make sense?" and wait for the student's answer. Do not call any function yet.`
            : `Picture ${i + 1} of ${segs.length} is on screen: ${seg.idea}. Say exactly this: "${seg.spokenText}" As you finish speaking, call show_segment(${i + 1}). Keep a steady pace, no pause, no questions.`
        );
      } else {
        voice.sendFunctionCallOutput(
          call_id,
          `There is no picture for this part. Explain "${seg.idea}" in your own words in two or three short sentences. ${
            last
              ? 'Then ask: "Does that make sense?" and wait. Do not call any function yet.'
              : `As you finish, call show_segment(${i + 1}).`
          }`
        );
      }
    } else if (name === "confirm_understanding") {
      const node = mapRef.current?.nodes.find((n) => n.id === activeRef.current);
      if (args?.understood === true) {
        const p = node?.practice;
        if (p && Array.isArray(p.choices) && p.choices.length === 3) {
          setSceneMode("quiz");
          voice.sendFunctionCallOutput(
            call_id,
            `The practice quiz is now the focus on screen. Read this question aloud exactly: "${p.question}" Then tell the student they can tap or circle their answer on screen, and wait. The screen will report what they do.`
          );
        } else {
          const m = mapRef.current;
          const idx = m ? m.nodes.findIndex((n) => n.id === activeRef.current) : -1;
          const next = m?.nodes[idx + 1];
          voice.sendFunctionCallOutput(
            call_id,
            `There is no practice for this topic. Praise the student in one short sentence, then call move_to_node with node_id "${next ? next.id : "wrap_up"}".`
          );
        }
      } else {
        voice.sendFunctionCallOutput(
          call_id,
          `The student is still confused${args?.confusion ? ` about: ${args.confusion}` : ""}. Explain the confusing part differently, in your own everyday words. You may call show_segment again to bring back an earlier picture while you explain. Then ask exactly: "Does that make sense?" again and wait.`
        );
      }
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
        voice.sendFunctionCallOutput(call_id, "That topic is not in this lesson. Pick another one.");
        return;
      }
      markDone(activeRef.current);
      openNode(node);
      voice.updateSession(
        teachingInstructions(m, node.id, practiceRef.current, profileRef.current),
        TEACHING_TOOLS
      );
      const segs = await buildPresentation(node);
      presentationRef.current = segs;
      setPresentation(segs);
      voice.sendFunctionCallOutput(
        call_id,
        `The screen now shows the topic "${node.label}" and its pictures are ready. Call show_segment(0) to begin presenting it.`
      );
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
    setHomeError(null);
    buildingRef.current = false;
    sessionIdRef.current = String(Date.now());
    setNotes([]);
    notesRef.current = [];
    exchangesRef.current = {};
    capturedRef.current = { user: "", tutor: "" };
    setPresentation(null);
    presentationRef.current = null;
    setSegIndex(null);
    segRef.current = null;
    setSceneMode("prep");
    sceneModeRef.current = "prep";
    nudgedRef.current = false;

    const question = (typedQuestion ?? "").trim();
    if (question) {
      // Typed question: build the lesson first, then the tutor presents it live.
      buildingRef.current = true;
      setBuildingMap(true);
      try {
        const m = await buildMap(question);
        const first = m.nodes[0];
        setMap(m);
        mapRef.current = m;
        openNode(first);
        setPhase("teaching");
        const segs = await buildPresentation(first);
        presentationRef.current = segs;
        setPresentation(segs);
        await voice.start(profileContext(p), {
          instructions: teachingInstructions(m, first.id, {}, p),
          tools: TEACHING_TOOLS,
          onToolCall: handleToolCall
        });
      } catch (err) {
        setHomeError("I could not build a lesson for that question. Try rephrasing it.");
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
    const m = mapRef.current;
    if (m && activeRef.current) {
      nudgedRef.current = false;
      voice.start(profileContext(p), {
        instructions: teachingInstructions(m, activeRef.current, practiceRef.current, p),
        tools: TEACHING_TOOLS,
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
    setNotes([]);
    notesRef.current = [];
    setPresentation(null);
    presentationRef.current = null;
    setSegIndex(null);
    setSceneMode("prep");
  };

  // The single lesson control: stop the lesson and land on the wrap-up
  // summary. Everything studied so far was already saved along the way.
  const stopLesson = () => {
    voice.stop();
    const m = mapRef.current;
    if (m) {
      markDone(activeRef.current);
      setDoneNodes(m.nodes.map((n) => n.id));
      setPhase("wrapup");
    } else {
      setPhase("home");
    }
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
    setNotes([]);
    notesRef.current = [];
    exchangesRef.current = {};
    capturedRef.current = { user: "", tutor: "" };
    setPresentation(null);
    presentationRef.current = null;
    setSegIndex(null);
    setSceneMode("prep");
    setPhase("asking");
    voice.updateSession(openQuestionInstructions(p), [START_TOPIC_TOOL]);
    voice.requestResponse("Ask the student what they would like to learn next, then wait.");
  };

  // --- Practice tracking: the scene reports the student's actual response ---
  const handleAttempt = (nodeId, entry) => {
    setPracticeLog((prev) => {
      const next = { ...prev, [nodeId]: { ...prev[nodeId], ...entry } };
      practiceRef.current = next;
      return next;
    });
    const m = mapRef.current;
    const node = m?.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const idx = m.nodes.findIndex((n) => n.id === nodeId);
    const nextNode = m.nodes[idx + 1];
    if (entry.correct) {
      voice.tellTutor(
        `(The student answered the practice for "${node.label}" correctly, after ${entry.attempts} attempt(s)${
          entry.hints ? ` with ${entry.hints} hint(s)` : ""
        }. Praise them in one short sentence, then call move_to_node with node_id "${nextNode ? nextNode.id : "wrap_up"}".)`
      );
    } else {
      voice.tellTutor(
        `(The student tried the practice for "${node.label}" and missed. Encourage them to try again in your own words, without revealing the answer. Do not call any function yet.)`
      );
    }
  };

  const handleStuck = (nodeId) => {
    const node = mapRef.current?.nodes.find((n) => n.id === nodeId);
    if (node) {
      voice.tellTutor(
        `(The student missed twice on the practice for "${node.label}". Re-teach this idea in very simple everyday words, then invite them to try the last choice.)`
      );
    }
  };

  // --- Local saving (prototype: this browser on this device only) ---
  useEffect(() => {
    if (!map) return;
    saveSession({
      id: sessionIdRef.current,
      savedAt: Date.now(),
      title: map.title,
      profile: profileRef.current,
      nodes: map.nodes,
      completedNodes: doneNodes,
      practiceLog,
      notes,
      finished: phase === "wrapup"
    });
  }, [map, doneNodes, practiceLog, notes, phase]);

  // --- Screens ---
  if (phase === "home") {
    const prepareSession = (p, typedQuestion) => {
      setPending({ profile: p, typedQuestion });
      setPhase("ready");
    };
    return <TutorHome onStart={prepareSession} error={homeError} busy={buildingMap} />;
  }

  if (phase === "ready") {
    return (
      <QuietRoomCheck
        onBegin={() => startSession(pending?.profile, pending?.typedQuestion ?? "")}
        onBack={() => setPhase("home")}
      />
    );
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

  if (phase === "wrapup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-xl">
          <WrapUpCard map={map} practiceLog={practiceLog} onNewQuestion={askNewQuestion} onEnd={endSession} />
        </div>
      </div>
    );
  }

  const activeNode = map?.nodes.find((n) => n.id === activeNodeId);
  const segment = presentation && segIndex != null ? presentation[segIndex] : null;

  return (
    <LessonScene
      node={activeNode}
      mode={sceneMode}
      segment={segment}
      captionsOn={!!profile?.captions}
      captionText={voice.tutorText}
      voiceStatus={voice.status}
      onRetryVoice={reconnectVoice}
      onStop={stopLesson}
      onAttempt={handleAttempt}
      onStuck={handleStuck}
      reducedMotion={!!profile?.reducedMotion}
    />
  );
}