import { useCallback, useEffect, useRef, useState } from "react";

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

// Speak text and resolve when the speech engine reports it has finished
// (or was cancelled). Where speech is unavailable, hold for a reading-time
// estimate so the lesson still advances.
function speakText(text, rate) {
  return new Promise((resolve) => {
    if (!canSpeak()) {
      setTimeout(resolve, Math.max(1500, text.split(/\s+/).length * 330 / rate));
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.onend = resolve;
    u.onerror = resolve;
    window.speechSynthesis.speak(u);
  });
}

const stepText = (s) => s?.narration || s?.description || "";

// One shared lesson controller: speaks each scene step aloud while the
// canvas plays that exact step. Step changes follow the speech engine's
// "finished" event, not timers.
export function useSpokenLesson({ getScene, goToStep, isAnimating }) {
  const [status, setStatus] = useState("idle"); // idle | speaking | paused | answering | done
  const [stepIdx, setStepIdx] = useState(-1);
  const [rate, setRate] = useState(1);
  const token = useRef(0);
  const idxRef = useRef(0);
  const rateRef = useRef(1);
  const animRef = useRef(false);
  const waiters = useRef([]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    animRef.current = isAnimating;
    if (!isAnimating) {
      waiters.current.forEach((f) => f());
      waiters.current = [];
    }
  }, [isAnimating]);

  const halt = useCallback(() => {
    token.current += 1;
    if (canSpeak()) window.speechSynthesis.cancel();
    waiters.current.forEach((f) => f());
    waiters.current = [];
  }, []);

  const run = useCallback(
    async (from = 0) => {
      halt();
      const my = token.current;
      setStatus("speaking");
      for (let i = from; ; i += 1) {
        const seq = getScene()?.sequence ?? [];
        if (i >= seq.length) break;
        idxRef.current = i;
        setStepIdx(i);
        goToStep(i);
        await speakText(`Step ${i + 1}. ${stepText(seq[i])}`, rateRef.current);
        if (token.current !== my) return;
        if (animRef.current) await new Promise((res) => waiters.current.push(res));
        if (token.current !== my) return;
      }
      setStatus("done");
    },
    [getScene, goToStep, halt]
  );

  // Speak a free-form answer, then report whether it finished uninterrupted.
  const say = useCallback(
    async (text) => {
      halt();
      const my = token.current;
      setStatus("answering");
      await speakText(text, rateRef.current);
      return token.current === my;
    },
    [halt]
  );

  const pause = useCallback(() => {
    halt();
    setStatus("paused");
  }, [halt]);

  const stop = useCallback(() => {
    halt();
    setStatus("idle");
    setStepIdx(-1);
  }, [halt]);

  const resume = useCallback(() => run(idxRef.current), [run]);
  const getIndex = useCallback(() => idxRef.current, []);

  useEffect(() => () => halt(), [halt]);

  return { status, stepIdx, rate, setRate, run, say, pause, resume, stop, getIndex };
}