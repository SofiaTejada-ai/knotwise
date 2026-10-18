import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { APPROVED_SOURCES } from "@/lib/visualTutorSources";

// Merge a delta into the current scene: find the step with step ===
// inject_after_step, splice the new steps after it, and mark them so playback
// can start there. Returns the merged scene, or null if nothing to merge.
export function mergeSceneDelta(scene, delta) {
  if (!scene || !delta || !Array.isArray(delta.new_steps) || delta.new_steps.length === 0) return scene;
  const seq = Array.isArray(scene.sequence) ? [...scene.sequence] : [];
  const after = typeof delta.inject_after_step === "number" ? delta.inject_after_step : seq.length;
  let idx = seq.findIndex((s) => s.step === after);
  if (idx === -1) idx = seq.length - 1;
  const insertAt = idx + 1;
  const marked = delta.new_steps.map((s) => ({ ...s, inserted: true }));
  const steps = [...seq.slice(0, insertAt), ...marked, ...seq.slice(insertAt)];
  return {
    ...scene,
    title: delta.title || scene.title,
    sequence: steps.map((s, i) => ({ ...s, step: i + 1 }))
  };
}

export function useAnimationTutor() {
  const [scene, setScene] = useState(null);
  const [startStep, setStartStep] = useState(0);
  const [playToken, setPlayToken] = useState(0);
  const [playMode, setPlayMode] = useState("single");
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [source, setSource] = useState(null);
  const [error, setError] = useState(null);

  const sceneRef = useRef(null);
  const historyRef = useRef([]);
  const currentStepRef = useRef(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const sendMessage = useCallback(async (text, opts = {}) => {
    const q = String(text ?? "").trim();
    if (!q) return null;
    setError(null);
    setMessages((m) => [...m, { role: "user", text: q, spoken: !!opts.spoken }]);
    setIsLoading(true);
    try {
      const res = await base44.functions.invoke("callTutor", {
        prompt: q,
        currentScene: sceneRef.current,
        history: historyRef.current.slice(-8),
        approvedSources: APPROVED_SOURCES,
        groundingText: opts.groundingText
      });
      const data = res?.data ?? res;
      const sc = data?.scene;
      if (!sc || typeof sc !== "object") throw new Error("no scene");
      let nextScene;
      let start;
      if (sc.delta === true) {
        nextScene = mergeSceneDelta(sceneRef.current, sc);
        if (!nextScene || nextScene === sceneRef.current) {
          // nothing merged: treat as fresh scene if the model sent objects
          if (Array.isArray(sc.objects) && sc.objects.length && Array.isArray(sc.sequence)) {
            nextScene = sc;
            start = 0;
          } else {
            throw new Error("empty delta");
          }
        } else {
          start = Math.max(0, nextScene.sequence.findIndex((s) => s.inserted));
        }
      } else {
        nextScene = sc;
        start = 0;
      }
      sceneRef.current = nextScene;
      setScene(nextScene);
      setStartStep(start);
      setCurrentStep(start);
      setPlayMode("single");
      setPlayToken((t) => t + 1);
      setSource(data?.source ?? null);
      const narration = typeof data?.narration === "string" && data.narration.trim() ? data.narration : "";
      historyRef.current = [
        ...historyRef.current,
        { role: "user", text: q },
        { role: "tutor", text: narration }
      ].slice(-12);
      if (narration) setMessages((m) => [...m, { role: "tutor", text: narration }]);
      return narration || "Here is the animation.";
    } catch (err) {
      setError("Animation generation failed — try rephrasing your question");
      setMessages((m) => [
        ...m,
        { role: "tutor", text: "I could not build that animation. Try rephrasing your question." }
      ]);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Builds a complete scene without touching the current one or playing it.
  const buildScene = useCallback(async (prompt, groundingText) => {
    const res = await base44.functions.invoke("callTutor", {
      prompt,
      currentScene: null,
      history: [],
      approvedSources: APPROVED_SOURCES,
      groundingText
    });
    const sc = (res?.data ?? res)?.scene;
    if (!sc || sc.delta === true || !sc.objects?.length || !sc.sequence?.length) throw new Error("no scene");
    return sc;
  }, []);

  // Puts a ready scene on the canvas (or clears it) without playing a step.
  const loadScene = useCallback((sc) => {
    sceneRef.current = sc || null;
    setScene(sc || null);
    setStartStep(0);
    setCurrentStep(0);
  }, []);

  const goToStep = useCallback((i) => {
    const sc = sceneRef.current;
    if (!sc || !Array.isArray(sc.sequence) || sc.sequence.length === 0) return;
    const n = sc.sequence.length;
    const idx = Math.max(0, Math.min(n - 1, i));
    setStartStep(idx);
    setCurrentStep(idx);
    setPlayMode("single");
    setPlayToken((t) => t + 1);
  }, []);

  const replay = useCallback(() => {
    if (!sceneRef.current) return;
    setStartStep(0);
    setCurrentStep(0);
    setPlayMode("full");
    setPlayToken((t) => t + 1);
  }, []);

  const replayStep = useCallback(() => goToStep(currentStepRef.current), [goToStep]);
  const nextStep = useCallback(() => goToStep(currentStepRef.current + 1), [goToStep]);
  const prevStep = useCallback(() => goToStep(currentStepRef.current - 1), [goToStep]);

  const moveNode = useCallback((id, x, y) => {
    const sc = sceneRef.current;
    if (!sc) return;
    const next = { ...sc, objects: (sc.objects ?? []).map((o) => (o.id === id ? { ...o, x, y } : o)) };
    sceneRef.current = next;
    setScene(next);
  }, []);

  const updateObject = useCallback((id, props) => {
    const sc = sceneRef.current;
    if (!sc) return;
    const next = { ...sc, objects: (sc.objects ?? []).map((o) => (o.id === id ? { ...o, ...props } : o)) };
    sceneRef.current = next;
    setScene(next);
  }, []);

  const getScene = useCallback(() => sceneRef.current, []);

  const reset = useCallback(() => {
    sceneRef.current = null;
    historyRef.current = [];
    setScene(null);
    setMessages([]);
    setSource(null);
    setError(null);
    setStartStep(0);
    setCurrentStep(0);
    setPlayToken(0);
  }, []);

  return {
    scene,
    startStep,
    playToken,
    playMode,
    currentStep,
    setCurrentStep,
    isAnimating,
    setIsAnimating,
    isLoading,
    messages,
    source,
    error,
    canvasRef,
    getScene,
    sendMessage,
    buildScene,
    loadScene,
    goToStep,
    replay,
    replayStep,
    nextStep,
    prevStep,
    moveNode,
    updateObject,
    reset
  };
}