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
  DIRECTOR_TOOLS,
  openQuestionInstructions,
  teachingInstructions,
  streamingInstructions,
  profileContext
} from "@/lib/liveTutorSession";
import { useLessonOrchestrator } from "@/hooks/useLessonOrchestrator";
import { useAnimationTutor } from "@/hooks/useAnimationTutor";
import { useGuidedLesson } from "@/hooks/useGuidedLesson";
import LiveSceneStage from "@/components/livetutor/LiveSceneStage";

// Animated-scene steps become the professor's spoken segments.
function sceneToSegments(scene) {
  const segs = (scene.sequence ?? []).map((s) => ({
    idea: s.description || s.action,
    spokenText: s.description || s.action,
    nodes: [],
    edges: []
  }));
  segs.scene = scene;
  return segs;
}
import { matchTemplate, templateSegments, toSegments } from "@/lib/visualSpec";

import { createDirector, DIRECTOR_TOOL_NAMES } from "@/lib/sceneDirector";

const TEACHING_TOOLS = [SHOW_SEGMENT_TOOL, CONFIRM_UNDERSTANDING_TOOL, MOVE_NODE_TOOL, ...DIRECTOR_TOOLS];

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
  const orch = useLessonOrchestrator();

  const topicKeyRef = useRef(null); // visual key of the topic on screen ("opening" until the outline arrives)
  const visualPromisesRef = useRef({}); // diagram requests per topic key
  const questionRef = useRef("");
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
  const segCacheRef = useRef({}); // prefetched segments per node id
  const prefetchingRef = useRef({}); // node ids with a prefetch in flight
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

  // Animated scene (SVG + GSAP + camera). It is driven by the one voice
  // professor above through show_segment, never by a second conversation.
  const tutor = useAnimationTutor();
  const tutorRef = useRef(tutor);
  tutorRef.current = tutor;
  const animRef = useRef(false);
  animRef.current = tutor.isAnimating;
  const canvasRef = useRef(null);
  const moveTimerRef = useRef(null);
  const guidedStatus =
    phase === "teaching" && sceneMode === "present" && segIndex != null
      ? voice.status === "listening"
        ? "paused"
        : "speaking"
      : "idle";
  const guided = useGuidedLesson({
    canvasRef,
    scene: tutor.scene,
    lessonStatus: guidedStatus,
    stepIdx: segIndex ?? -1,
    question: questionRef.current,
    auto: false // the professor directs the camera with explicit commands
  });
  const guidedRef = useRef(guided);
  guidedRef.current = guided;

  const waitIdle = (ms) =>
    new Promise((res) => {
      const t0 = Date.now();
      const tick = () => (!animRef.current || Date.now() - t0 > ms ? res() : setTimeout(tick, 150));
      tick();
    });
  const directorRef = useRef(null);
  if (!directorRef.current) {
    directorRef.current = createDirector({
      scene: () => tutorRef.current.getScene(),
      canvas: () => canvasRef.current,
      guided: () => guidedRef.current,
      tutor: () => tutorRef.current,
      setSeg: (i) => {
        setSegIndex(i);
        setSceneMode("present");
      },
      waitIdle
    });
  }

  // A student interruption freezes visuals and drops queued commands, keeping
  // the last committed state.
  useEffect(() => {
    if (phase === "teaching" && voice.userTranscript) directorRef.current.interrupt();
  }, [voice.userTranscript]);

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
  // Visual Generation Engine: asks the backend for a literal technical diagram
  // plus teaching steps, validates it, and falls back to a deterministic
  // technical diagram. Never blocks the professor.
  const fetchSegments = async (node, question) => {
    const topicText = `${node.label} ${node.description ?? ""} ${question ?? ""}`;
    // Preferred: a complete animated scene. If it cannot be built, fall back
    // to the simple technical diagram below.
    try {
      const prompt =
        node.id === "opening"
          ? question
          : `${node.label}: ${node.description ?? ""}. Part of a lesson about: ${mapRef.current?.title || question}`;
      return sceneToSegments(await tutorRef.current.buildScene(prompt));
    } catch (err) {
      // continue with the simple diagram
    }
    const res = await base44.functions.invoke("buildNodePresentation", {
      nodeLabel: node.label,
      nodeDescription: node.description ?? "",
      question: question || mapRef.current?.title || "",
      ageRange: profileRef.current?.ageRange ?? ""
    });
    return toSegments(res?.data, topicText);
  };

  const applyPresentation = (segs) => {
    presentationRef.current = segs;
    setPresentation(segs);
    tutorRef.current.loadScene(segs?.scene ?? null);
    orch.setVisual(segs?.scene ? "animated_scene" : segs?.visual?.source ?? "none", { source: segs?.visual?.source, steps: segs?.length ?? 0 });
  };

  // Starts (or reuses) the diagram request for a topic. When it lands and that
  // topic is still the one on screen, the canvas updates; otherwise the result
  // is only cached. Stale results from an older lesson are discarded.
  const loadTopicVisual = (key, node, { question, allowTemplate } = {}) => {
    if (visualPromisesRef.current[key]) return visualPromisesRef.current[key];
    const tpl = allowTemplate ? matchTemplate(question) : null;
    const p = tpl
      ? Promise.resolve({ result: templateSegments(tpl), fresh: true })
      : orch.requestVisual(key, () => fetchSegments(node, question));
    const done = p.then(({ result, fresh }) => {
      if (!fresh) return null;
      const segs = result ?? [{ idea: node.label, spokenText: null }];
      segCacheRef.current[key] = segs;
      if (topicKeyRef.current === key) applyPresentation(segs);
      return segs;
    });
    visualPromisesRef.current[key] = done;
    return done;
  };

  // Prepare the next topic's diagram in the background while the current one
  // is being taught, so moving on is instant.
  const prefetchNext = (node) => {
    const m = mapRef.current;
    if (!m || !node) return;
    const next = m.nodes[m.nodes.findIndex((n) => n.id === node.id) + 1];
    if (next) loadTopicVisual(next.id, next, { question: questionRef.current });
  };

  const openNode = (node) => {
    setActiveNodeId(node.id);
    activeRef.current = node.id;
    topicKeyRef.current = node.id;
    orch.setTopic(node.label, node.description);
    const cached = segCacheRef.current[node.id];
    tutorRef.current.loadScene(cached?.scene ?? null);
    setPresentation(cached ?? null);
    presentationRef.current = cached ?? null;
    setSegIndex(null);
    setSceneMode("prep");
  };

  // Streaming start: the canvas and the professor begin at once. The lesson
  // outline (topics and practice) is built in the background and attached
  // when ready, without resetting what is on screen.
  const beginStreaming = (question) => {
    questionRef.current = question;
    const lessonId = orch.beginLesson(question);
    topicKeyRef.current = "opening";
    segCacheRef.current = {};
    prefetchingRef.current = {};
    visualPromisesRef.current = {};
    presentationRef.current = null;
    setPresentation(null);
    setSegIndex(null);
    setSceneMode("present");
    setPhase("teaching");
    buildingRef.current = true;
    setBuildingMap(true);
    tutorRef.current.reset();
    loadTopicVisual("opening", { id: "opening", label: question.slice(0, 80), description: question }, {
      question
    });
    buildMap(question)
      .then((m) => {
        if (orch.stateRef.current.lessonId !== lessonId) return;
        const first = m.nodes[0];
        setMap(m);
        mapRef.current = m;
        setActiveNodeId(first.id);
        activeRef.current = first.id;
        orch.setTopic(first.label, first.description);
        voice.updateSession(
          teachingInstructions(m, first.id, practiceRef.current, profileRef.current),
          TEACHING_TOOLS
        );
        prefetchNext(first);
      })
      .catch(() => {
        if (orch.stateRef.current.lessonId === lessonId) {
          voice.tellTutor(
            "(The practice questions could not be built. Keep teaching conversationally and finish with a short spoken summary.)"
          );
        }
      })
      .finally(() => {
        buildingRef.current = false;
        setBuildingMap(false);
      });
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
    if (!node) {
      // The outline is still building: teach from the question right away.
      voice.requestResponse(
        `(The student asked: "${questionRef.current}". Begin right away: say one short natural sentence about it, then call show_segment(0) and follow its words. Never say anything is being prepared.)`
      );
      return;
    }
    if (sceneModeRef.current === "quiz") {
      voice.requestResponse(
        `(Reconnected. The practice quiz is on screen for "${node.label}". Remind the student they can tap or circle their answer, then wait.)`
      );
    } else if (sceneModeRef.current === "present") {
      voice.requestResponse(
        `(Reconnected. The screen shows the picture for part ${(segRef.current ?? 0) + 1} of "${node.label}". If there are more parts, call show_segment with the next part number. If that was the last part, ask exactly: "Does that make sense?" and wait.)`
      );
    } else {
      voice.requestResponse(
        `(The student is ready and the topic is "${node.label}". Say one short natural sentence, then call show_segment(0) and speak the words the tool result gives you.)`
      );
    }
  };

  // The professor starts as soon as the voice is live; the lesson state only
  // has to exist, never the finished presentation.
  useEffect(() => {
    if (phase !== "teaching" || voice.status !== "listening") return;
    if (!orch.stateRef.current.lessonId) return;
    if (nudgedRef.current) return;
    nudgedRef.current = true;
    nudgeAfterConnect();
  }, [voice.status, phase, orch.state.lessonId]);

  // Keep the shared lesson state in step with what the professor is doing.
  useEffect(() => {
    orch.setProfessorStatus(voice.status);
  }, [voice.status]);
  useEffect(() => {
    if (voice.userTranscript) orch.noteInteraction("speech", voice.userTranscript.slice(0, 120));
  }, [voice.userTranscript]);

  const handleNodeClick = (n) => {
    orch.noteInteraction("diagram_click", n.label);
    voice.tellTutor(
      `(The student tapped "${n.label}" in the diagram. Briefly explain what it is and what it does here, then continue where you left off.)`
    );
  };

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
    if (DIRECTOR_TOOL_NAMES.includes(name)) {
      // Professor's visual commands: validated and queued by the director.
      if (!tutorRef.current.getScene()) {
        voice.sendFunctionCallOutput(call_id, "The diagram is not on screen yet. Keep explaining in your own words.");
        return;
      }
      voice.sendFunctionCallOutput(call_id, await directorRef.current.run(name, args ?? {}));
      return;
    }
    if (name === "start_topic") {
      if (orch.stateRef.current.lessonId) {
        voice.sendFunctionCallOutput(call_id, "The lesson is already on screen. Keep teaching.");
        return;
      }
      // Streaming start: answer the tool at once so the professor speaks
      // immediately while the diagram and outline build in parallel.
      const q = String(args?.question ?? "").trim() || voice.userTranscript || "the student's question";
      beginStreaming(q);
      voice.updateSession(streamingInstructions(q, profileRef.current), TEACHING_TOOLS);
      nudgedRef.current = true; // the function output below cues the tutor
      voice.sendFunctionCallOutput(
        call_id,
        `The technical diagram for "${q}" is appearing on the student's screen now. Begin right away: say one short natural sentence about their question, then call show_segment(0) and follow its words. Never say anything is being prepared.`
      );
    } else if (name === "show_segment") {
      let segs = presentationRef.current;
      if (!segs) {
        // The diagram is still being drawn. Wait only briefly: the professor
        // has already been speaking, and never stalls on it.
        const key = topicKeyRef.current;
        const pending = visualPromisesRef.current[key];
        segs = pending ? await Promise.race([pending, new Promise((r) => setTimeout(() => r(null), 5000))]) : null;
        if (!segs || key !== topicKeyRef.current) {
          voice.sendFunctionCallOutput(
            call_id,
            "The diagram is not on screen yet. Explain the student's question in your own plain words in two or three sentences, as if teaching step by step, then call show_segment(0) again. Never say anything is being prepared."
          );
          return;
        }
        if (!presentationRef.current) applyPresentation(segs);
      }
      const i = Math.min(Math.max(Number(args?.segment_index) || 0, 0), Math.max(segs.length - 1, 0));
      const seg = segs[i];
      setSegIndex(i);
      setSceneMode("present");
      orch.setStep(i, { nodes: seg?.nodes ?? [], edges: seg?.edges ?? [] });
      if (!seg) {
        voice.sendFunctionCallOutput(call_id, "There is nothing to show for this part. Continue explaining calmly.");
        return;
      }
      const last = i === segs.length - 1;
      if (segs.scene) {
        const dir = directorRef.current;
        if (i > 0) {
          // Later parts are played by the director, like play_step.
          voice.sendFunctionCallOutput(call_id, await dir.run("play_step", { step_id: i + 1 }));
          return;
        }
        // Start: the whole diagram first, then the camera goes to the first part.
        await dir.run("show_overview");
        await new Promise((r) => setTimeout(r, 1500));
        const firstId = guidedRef.current.nodeSeq.find(Boolean) ?? segs.scene.objects?.[0]?.id;
        await dir.run("focus_node", { node_id: firstId });
        const meta = await guidedRef.current.getIntro(2500);
        const parts = (segs.scene.objects ?? [])
          .filter((o) => o.type !== "note")
          .map((o) => `${o.id} ("${o.label}")`)
          .join(", ");
        const steps = (segs.scene.sequence ?? []).map((s, k) => `${k + 1}) ${s.description || s.action}`).join(" ");
        voice.sendFunctionCallOutput(
          call_id,
          `The whole diagram was shown and the camera is now on "${(segs.scene.objects ?? []).find((o) => o.id === firstId)?.label || firstId}" with a simple picture above it. Diagram parts (id and label): ${parts}. Numbered steps: ${steps} ${
            meta ? `First give this one short everyday metaphor in your own words: "${meta}". ` : ""
          }Then explain that first part in two short accurate sentences, then call play_step(1) and keep directing as your rules say.`
        );
        return;
      }
      if (seg.spokenText) {
        voice.sendFunctionCallOutput(
          call_id,
          last
            ? `Diagram step ${i + 1} of ${segs.length} is highlighted on screen: ${seg.idea}. Say exactly this: "${seg.spokenText}" Then ask: "Does that make sense?" and wait for the student's answer. Do not call any function yet.`
            : `Diagram step ${i + 1} of ${segs.length} is highlighted on screen: ${seg.idea}. Say exactly this: "${seg.spokenText}" As you finish speaking, call show_segment(${i + 1}). Keep a steady pace, no pause, no questions.`
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
      if (!mapRef.current) {
        voice.sendFunctionCallOutput(
          call_id,
          "Keep chatting with the student about the topic for a moment, then ask again whether it makes sense."
        );
        return;
      }
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
      // Usually the next topic's diagram was prefetched while the last one was
      // taught. If not, it loads in the background and the professor starts
      // speaking right away.
      loadTopicVisual(node.id, node, { question: questionRef.current });
      prefetchNext(node);
      nudgedRef.current = true; // the function output below cues the tutor
      voice.sendFunctionCallOutput(
        call_id,
        `The screen now shows the topic "${node.label}". Say one short natural sentence introducing it, then call show_segment(0) and speak the words the tool result gives you. Never say anything is being prepared.`
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
    segCacheRef.current = {};
    prefetchingRef.current = {};
    tutorRef.current.reset();

    const question = (typedQuestion ?? "").trim();
    if (question) {
      // Typed question: the diagram and the professor start together; the
      // outline builds in the background.
      beginStreaming(question);
      voice.start(profileContext(p), {
        instructions: streamingInstructions(question, p),
        tools: TEACHING_TOOLS,
        onToolCall: handleToolCall
      });
    } else {
      orch.reset();
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
    } else if (orch.stateRef.current.lessonId && questionRef.current) {
      nudgedRef.current = false;
      voice.start(profileContext(p), {
        instructions: streamingInstructions(questionRef.current, p),
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
    orch.reset();
    tutor.reset();
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
    orch.reset();
    tutor.reset();
    segCacheRef.current = {};
    prefetchingRef.current = {};
    visualPromisesRef.current = {};
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
  // Student moves a piece: the professor reacts once things settle.
  const handleMove = (id, x, y) => {
    const label = (tutor.scene?.objects ?? []).find((o) => o.id === id)?.label || id;
    tutor.moveNode(id, x, y);
    clearTimeout(moveTimerRef.current);
    moveTimerRef.current = setTimeout(() => {
      orch.noteInteraction("diagram_move", label);
      voice.tellTutor(
        `(The student dragged "${label}" to a new place on the diagram. React in one short sentence and continue where you left off.)`
      );
    }, 1500);
  };
  const handleSelect = (id) => {
    guided.selectNode(id);
    const label = (tutor.scene?.objects ?? []).find((o) => o.id === id)?.label;
    if (label) handleNodeClick({ label });
  };
  const stage = tutor.scene ? (
    <LiveSceneStage
      tutor={tutor}
      canvasRef={canvasRef}
      guided={guided}
      onMoveNode={handleMove}
      onSelectNode={handleSelect}
    />
  ) : null;

  return (
    <LessonScene
      stage={stage}
      node={activeNode}
      mode={sceneMode}
      visual={presentation?.visual ?? null}
      steps={presentation}
      stepIndex={segIndex}
      onNodeClick={handleNodeClick}
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