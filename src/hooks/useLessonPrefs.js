import { useState } from "react";

const KEY = "knotwise_graph_prefs";
const SIZES = [18, 20, 24];

function load() {
  try {
    return { focus: false, reduceMotion: false, textSize: 18, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch (err) {
    return { focus: false, reduceMotion: false, textSize: 18 };
  }
}

// Focus, Reduce Motion and Text Size, remembered on this device.
export function useLessonPrefs() {
  const [prefs, setPrefs] = useState(load);
  const systemReduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const update = (patch) =>
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (err) {
        // Storage unavailable: preferences just last for this visit.
      }
      return next;
    });

  return {
    focus: prefs.focus,
    reduceMotion: prefs.reduceMotion || !!systemReduce,
    systemReduce: !!systemReduce,
    textSize: prefs.textSize,
    toggleFocus: () => update({ focus: !prefs.focus }),
    toggleReduceMotion: () => update({ reduceMotion: !prefs.reduceMotion }),
    cycleTextSize: () => update({ textSize: SIZES[(SIZES.indexOf(prefs.textSize) + 1) % SIZES.length] })
  };
}