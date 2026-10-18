import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Which node a teaching step is about. A packet step arrives at its `to`;
// the very first step starts at its source.
export function nodeForStep(step, i) {
  if (!step) return null;
  if (step.action === "emit_packet" || step.action === "retransmit" || step.action === "highlight_path") {
    return i === 0 ? step.from || step.to || step.target : step.to || step.target || step.from;
  }
  return step.target || step.to || step.from || null;
}

const initial = {
  lessonId: null,
  sceneId: null,
  focusedNodeId: null,
  activeStepIndex: 0,
  cameraMode: "overview",
  professorStatus: "listening",
  visualStatus: "ready",
  imageByNodeId: {},
  guidedModeEnabled: true
};

function reducer(s, e) {
  switch (e.type) {
    case "LESSON_SCENE_READY":
      return { ...initial, lessonId: e.lessonId, sceneId: e.lessonId, guidedModeEnabled: s.guidedModeEnabled };
    case "RESET":
      return { ...initial, guidedModeEnabled: s.guidedModeEnabled };
    case "FOCUS_NODE":
      return { ...s, focusedNodeId: e.nodeId, cameraMode: "traveling" };
    case "FOLLOW_CONNECTION":
      return { ...s, focusedNodeId: e.to, cameraMode: "traveling" };
    case "ARRIVE_AT_NODE":
      return { ...s, focusedNodeId: e.nodeId, cameraMode: "focused" };
    case "NODE_EXPLANATION_STARTED":
      return { ...s, activeStepIndex: e.stepIdx ?? s.activeStepIndex, professorStatus: "speaking" };
    case "PLAY_NODE_ANIMATION":
      return { ...s, visualStatus: "animating" };
    case "NODE_EXPLANATION_COMPLETED":
      return { ...s, visualStatus: "ready" };
    case "IMAGE_REQUESTED":
      return { ...s, visualStatus: s.visualStatus === "animating" ? s.visualStatus : "loading_image" };
    case "IMAGE_FAILED":
      return { ...s, visualStatus: s.visualStatus === "loading_image" ? "ready" : s.visualStatus };
    case "NODE_IMAGE_READY":
      return {
        ...s,
        visualStatus: s.visualStatus === "loading_image" ? "ready" : s.visualStatus,
        imageByNodeId: { ...s.imageByNodeId, [e.nodeId]: e.url }
      };
    case "STUDENT_INTERRUPTED":
      return { ...s, professorStatus: "paused" };
    case "RESUME_GUIDED_LESSON":
      return { ...s, professorStatus: "speaking" };
    case "SHOW_OVERVIEW":
      return { ...s, cameraMode: "overview", focusedNodeId: null };
    case "SET_GUIDED":
      return { ...s, guidedModeEnabled: e.value };
    default:
      return s;
  }
}

// Shared guided-lesson state: ties the professor's spoken steps to the camera,
// the GSAP scene and the per-node technical pictures. The complete scene is
// never rebuilt; the camera only moves through it.
export function useGuidedLesson({ canvasRef, scene, lessonStatus, stepIdx, question, auto = true }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const eventLog = useRef([]);
  const lessonIdRef = useRef(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const cache = useRef(new Map());
  const inflight = useRef(new Set());
  const introRef = useRef(null);
  const introduced = useRef(new Set());
  const focusedRef = useRef(null);
  const runRef = useRef(0);
  const prevStatus = useRef("idle");
  const questionRef = useRef(question);
  questionRef.current = question;

  const emit = useCallback((type, payload = {}) => {
    eventLog.current = [...eventLog.current.slice(-39), { type, ...payload }];
    dispatch({ type, ...payload });
  }, []);

  const nodeSeq = useMemo(
    () => (scene?.sequence ?? []).map((s, i) => nodeForStep(s, i)),
    [scene?.sequence]
  );

  const requestImage = useCallback(
    (nodeId, first = false) => {
      const lid = lessonIdRef.current;
      const key = `${lid}:${nodeId}`;
      if (!lid || !nodeId || cache.current.has(key) || inflight.current.has(key)) return;
      const sc = sceneRef.current;
      const obj = (sc?.objects ?? []).find((o) => o.id === nodeId);
      if (!obj) return;
      inflight.current.add(key);
      emit("IMAGE_REQUESTED", { nodeId });
      const step = (sc.sequence ?? []).find((s) => s.target === nodeId || s.to === nodeId);
      const p = base44.functions
        .invoke("generateNodeImage", {
          nodeLabel: obj.label || obj.id,
          nodeType: obj.type,
          sceneTitle: sc.title || "",
          question: questionRef.current || "",
          detail: step?.description || "",
          first
        })
        .then((r) => r?.data ?? r)
        .catch(() => null);
      if (first) introRef.current = { lid, p };
      p.then((d) => {
        inflight.current.delete(key);
        if (lessonIdRef.current !== lid) return; // stale lesson: discard
        cache.current.set(key, d?.url || null);
        if (d?.url) emit("NODE_IMAGE_READY", { nodeId, url: d.url });
        else emit("IMAGE_FAILED", { nodeId });
      });
    },
    [emit]
  );

  // New complete scene: it becomes the lesson. Follow-up deltas keep the id.
  const sceneId = scene ? scene.scene_id || scene.title || "scene" : null;
  useEffect(() => {
    if (sceneId === lessonIdRef.current) return;
    lessonIdRef.current = sceneId;
    cache.current = new Map();
    inflight.current = new Set();
    introRef.current = null;
    focusedRef.current = null;
    runRef.current += 1;
    canvasRef.current?.showOverview();
    if (!sceneId) {
      emit("RESET");
      return;
    }
    emit("LESSON_SCENE_READY", { lessonId: sceneId });
    const first = nodeSeq.find(Boolean);
    if (first) requestImage(first, true);
    const second = nodeSeq.find((n) => n && n !== first);
    if (second) requestImage(second);
  }, [sceneId]);

  const arrive = useCallback(
    (node, idx) => {
      emit("ARRIVE_AT_NODE", { nodeId: node });
      emit("NODE_EXPLANATION_STARTED", { nodeId: node, stepIdx: idx });
      requestImage(node);
      const next = nodeSeq.slice(Math.max(0, idx) + 1).find((n) => n && n !== node);
      if (next) requestImage(next); // prefetch while this node is explained
    },
    [emit, nodeSeq, requestImage]
  );

  const guidedOnRef = useRef(true);
  guidedOnRef.current = state.guidedModeEnabled;

  // Moves the camera to a node (following the connection from the previous
  // or given node when `follow`), then settles, shows its picture and returns.
  // Used by both the professor's commands and the automatic step events.
  const travelTo = useCallback(
    async (node, idx, { follow = false, from, showDot = true } = {}) => {
      if (!node || !guidedOnRef.current) return;
      const prev = from ?? focusedRef.current;
      if (prev === node) {
        emit("PLAY_NODE_ANIMATION", { nodeId: node });
        return;
      }
      const my = ++runRef.current;
      focusedRef.current = node;
      if (prev) emit("NODE_EXPLANATION_COMPLETED", { nodeId: prev });
      emit("PLAY_NODE_ANIMATION", { nodeId: node });
      if (follow && prev) {
        emit("FOLLOW_CONNECTION", { from: prev, to: node });
        await canvasRef.current?.followConnection(prev, node, { showDot });
      } else {
        emit("FOCUS_NODE", { nodeId: node });
        await canvasRef.current?.focusNode(node);
      }
      if (runRef.current === my) arrive(node, idx);
    },
    [arrive, emit, canvasRef]
  );

  const overview = useCallback(() => {
    runRef.current += 1;
    focusedRef.current = null;
    emit("SHOW_OVERVIEW");
    return canvasRef.current?.showOverview();
  }, [emit, canvasRef]);

  // Automatic camera for teaching steps (disabled when the professor directs
  // the camera with explicit commands).
  useEffect(() => {
    if (!auto || !state.guidedModeEnabled || stepIdx < 0 || lessonStatus === "idle" || lessonStatus === "done") return;
    const node = nodeSeq[stepIdx];
    if (!node) return;
    const st = sceneRef.current?.sequence?.[stepIdx];
    const prev = focusedRef.current;
    const hasPacket = st?.action === "emit_packet" && st.from === prev && st.to === node;
    travelTo(node, stepIdx, { follow: true, showDot: !hasPacket });
  }, [stepIdx, lessonStatus, state.guidedModeEnabled, nodeSeq]);

  // Lesson finished: pull back to the complete diagram.
  useEffect(() => {
    if (lessonStatus === "done" && state.guidedModeEnabled) {
      runRef.current += 1;
      focusedRef.current = null;
      emit("SHOW_OVERVIEW");
      canvasRef.current?.showOverview();
    }
  }, [lessonStatus]);

  // Interruptions leave camera, image and scene state exactly as they are.
  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = lessonStatus;
    if (lessonStatus === "paused") emit("STUDENT_INTERRUPTED");
    else if (lessonStatus === "speaking" && prev === "paused") emit("RESUME_GUIDED_LESSON");
  }, [lessonStatus]);

  const focusFirst = useCallback(async () => {
    const n = nodeSeq.find(Boolean);
    if (!n || !state.guidedModeEnabled) return;
    const my = ++runRef.current;
    focusedRef.current = n;
    emit("FOCUS_NODE", { nodeId: n });
    await canvasRef.current?.focusNode(n);
    if (runRef.current === my) arrive(n, 0);
  }, [nodeSeq, state.guidedModeEnabled, arrive, emit, canvasRef]);

  // One short orienting metaphor, once per lesson, never worth waiting long for.
  const getIntro = useCallback(async (ms = 2500) => {
    const lid = lessonIdRef.current;
    const intro = introRef.current;
    if (!lid || introduced.current.has(lid) || !intro || intro.lid !== lid) return "";
    introduced.current.add(lid);
    const d = await Promise.race([intro.p, new Promise((r) => setTimeout(() => r(null), ms))]);
    return d?.metaphor || "";
  }, []);

  const selectNode = useCallback(
    async (id) => {
      const my = ++runRef.current;
      focusedRef.current = id;
      emit("FOCUS_NODE", { nodeId: id });
      await canvasRef.current?.focusNode(id);
      if (runRef.current === my) arrive(id, nodeSeq.indexOf(id));
    },
    [arrive, emit, nodeSeq, canvasRef]
  );

  const zoomOut = useCallback(() => {
    runRef.current += 1;
    focusedRef.current = null;
    emit("SET_GUIDED", { value: false });
    emit("SHOW_OVERVIEW");
    canvasRef.current?.showOverview();
  }, [emit, canvasRef]);

  const setGuided = useCallback(
    (value) => {
      emit("SET_GUIDED", { value });
      if (value && stepIdx >= 0 && nodeSeq[stepIdx]) selectNode(nodeSeq[stepIdx]);
    },
    [emit, stepIdx, nodeSeq, selectNode]
  );

  const imageUrl =
    state.cameraMode === "focused" && state.focusedNodeId ? state.imageByNodeId[state.focusedNodeId] : null;
  const focusedLabel = (scene?.objects ?? []).find((o) => o.id === state.focusedNodeId)?.label;

  return { state, imageUrl, focusedLabel, focusFirst, getIntro, selectNode, zoomOut, setGuided, eventLog, travelTo, overview, nodeSeq };
}