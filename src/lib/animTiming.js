// Animation pace.
//  - scale: adaptive. The lesson scheduler lowers it when teaching commands
//    are waiting, so visuals keep up with the professor (never below half,
//    never skipping a step).
//  - playback: temporary replay speed chosen by the professor for one
//    command ("show that again, slower"). 1 = normal, 0.65 slower, 0.4 very slow.
export const timing = { scale: 1, playback: 1 };

// Per-animation base durations in seconds (not one global speed).
export const DUR = {
  highlight: 0.34, // node highlight (total)
  camera: 0.8, // camera focus
  arrow: 0.45, // arrow activation
  transfer: 1.3, // value travelling along an arrow
  enter: 0.42, // value entering a box
  emphasis: 0.55 // state update emphasis
};

export const SPEEDS = { normal: 1, slower: 0.65, very_slow: 0.4 };

export const parseSpeed = (s) => {
  if (SPEEDS[s]) return SPEEDS[s];
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.max(0.4, Math.min(1, n)) : 1;
};

export const scaled = (seconds) => (seconds * Math.max(0.5, Math.min(1, timing.scale))) / timing.playback;