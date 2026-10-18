import { useRef, useState } from "react";
import { introText } from "@/lib/functionLessons";
import {
  evaluate,
  roundTo,
  formatNumber,
  predictionReply,
  sliderReply,
  emitInteractionEvent
} from "@/lib/functionRules";

// State for one lesson: the slider value, the prediction, and the professor transcript.
export function useFunctionLesson(lesson) {
  const key = lesson.slider.key;
  const [value, setValueState] = useState(lesson.defaults[key]);
  const valueRef = useRef(value);
  const committed = useRef(value);
  const [prediction, setPrediction] = useState(null);
  const [transcript, setTranscript] = useState([{ who: "professor", text: introText(lesson) }]);

  const params = { ...lesson.defaults, [key]: value };

  const setValue = (v) => {
    const clean = roundTo(Number(v), 2);
    valueRef.current = clean;
    setValueState(clean);
  };

  const submitGuess = (guess) => {
    const actual = evaluate(lesson.formula, lesson.defaults, lesson.predictX);
    setPrediction({ x: lesson.predictX, guess, actual });
    emitInteractionEvent({ type: "prediction_submitted", x: lesson.predictX, guess, actual: roundTo(actual, 4) });
    setTranscript((t) => [
      ...t,
      { who: "student", text: `My guess: ${formatNumber(guess)}` },
      { who: "professor", text: predictionReply(guess, actual) }
    ]);
  };

  // Called when the student lets go of the slider (mouse, touch or arrow key).
  const release = () => {
    const before = committed.current;
    const after = valueRef.current;
    if (before === after) return;
    committed.current = after;
    emitInteractionEvent({ type: "slider_released", key, before, after });
    const now = evaluate(lesson.formula, { ...lesson.defaults, [key]: after }, lesson.predictX);
    setTranscript((t) => [...t, { who: "professor", text: sliderReply(key, before, after, lesson.predictX, now) }]);
  };

  return { value, setValue, params, prediction, submitGuess, release, transcript, unlocked: !!prediction };
}