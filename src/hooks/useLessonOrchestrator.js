import { useCallback, useRef, useState } from "react";

// Lesson Synchronization Controller. One shared lesson state that the live
// professor, the visual engine and the canvas all read. Every visual request
// carries the lesson id and a request id, so a slow result from an older
// lesson or an older request for the same topic is discarded instead of
// overwriting newer content.

const INITIAL = {
  lessonId: null,
  currentTopic: null,
  currentConcept: null,
  activeTeachingStep: null,
  professorStatus: "idle",
  visualStatus: "idle", // idle | loading | ready | failed
  visualType: null,
  visualState: null,
  pendingVisualRequests: [],
  lastStudentInteraction: null
};

export function useLessonOrchestrator() {
  const stateRef = useRef(INITIAL);
  const [state, setState] = useState(INITIAL);
  const counter = useRef(0);
  const latestByTopic = useRef({});

  const apply = useCallback((patch) => {
    const next = { ...stateRef.current, ...(typeof patch === "function" ? patch(stateRef.current) : patch) };
    stateRef.current = next;
    setState(next);
  }, []);

  const beginLesson = useCallback(
    (question) => {
      counter.current += 1;
      const lessonId = `lesson-${Date.now()}-${counter.current}`;
      latestByTopic.current = {};
      apply({
        ...INITIAL,
        lessonId,
        currentTopic: question,
        currentConcept: question,
        visualStatus: "loading",
        lastStudentInteraction: { kind: "question", at: Date.now() }
      });
      return lessonId;
    },
    [apply]
  );

  // Ending a lesson invalidates every in-flight visual request.
  const reset = useCallback(() => {
    latestByTopic.current = {};
    apply(INITIAL);
  }, [apply]);

  const setTopic = useCallback(
    (topic, concept) => apply({ currentTopic: topic, currentConcept: concept ?? topic, activeTeachingStep: null }),
    [apply]
  );

  const setStep = useCallback(
    (index, highlight) =>
      apply((s) => ({ activeTeachingStep: index, visualState: { ...(s.visualState ?? {}), ...highlight } })),
    [apply]
  );

  const setProfessorStatus = useCallback((status) => apply({ professorStatus: status }), [apply]);

  const noteInteraction = useCallback(
    (kind, detail) => apply({ lastStudentInteraction: { kind, detail: detail ?? null, at: Date.now() } }),
    [apply]
  );

  const setVisual = useCallback(
    (visualType, visualState) => apply({ visualType, visualState, visualStatus: "ready" }),
    [apply]
  );

  // Runs the loader without blocking anything. Resolves { result, fresh }:
  // fresh is false when the lesson changed or a newer request replaced this one.
  const requestVisual = useCallback(
    (topicKey, loader) => {
      const lessonId = stateRef.current.lessonId;
      counter.current += 1;
      const requestId = `${lessonId}:${topicKey}:${counter.current}`;
      latestByTopic.current[topicKey] = requestId;
      apply((s) => ({ pendingVisualRequests: [...s.pendingVisualRequests, requestId] }));
      const finish = (result, ok) => {
        const fresh = stateRef.current.lessonId === lessonId && latestByTopic.current[topicKey] === requestId;
        apply((s) => ({
          pendingVisualRequests: s.pendingVisualRequests.filter((id) => id !== requestId),
          ...(fresh && !ok && !s.pendingVisualRequests.length ? { visualStatus: "failed" } : {})
        }));
        return { result: ok ? result : null, fresh };
      };
      return loader().then(
        (r) => finish(r, true),
        () => finish(null, false)
      );
    },
    [apply]
  );

  return {
    state,
    stateRef,
    beginLesson,
    reset,
    setTopic,
    setStep,
    setProfessorStatus,
    noteInteraction,
    setVisual,
    requestVisual
  };
}