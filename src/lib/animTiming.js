// Animation pace.
//  - scale: adaptive. The lesson scheduler lowers it when teaching commands
//    are waiting, so visuals keep up with the professor (never below half,
//    never skipping a step).
//  - playback: temporary replay speed chosen by the professor for one
//    command ("show that again, slower"). 1 = normal, 0.65 slower, 0.4 very slow.
export const timing = { scale: 1, playback: 1 };

// Per-animation base durations in seconds (not one global speed).
// Tuned for a classroom pace: a moving value stays readable for ~2s.
export const DUR = {
  highlight: 0.6, // node highlight (total)
  camera: 1.2, // camera focus
  arrow: 0.6, // arrow activation
  transfer: 2.0, // value travelling along an arrow
  enter: 0.7, // value entering a box
  emphasis: 0.8, // state update emphasis
  hold: 0.7 // pause on a result so the student can read it
};

export const SPEEDS = { normal: 1, slower: 0.65, very_slow: 0.4 };

export const parseSpeed = (s) => {
  if (SPEEDS[s]) return SPEEDS[s];
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.max(0.4, Math.min(1, n)) : 1;
};

export const scaled = (seconds) => (seconds * Math.max(0.5, Math.min(1, timing.scale))) / timing.playback;