// Adaptive animation pace. 1 = normal. The lesson scheduler lowers it when
// teaching commands are waiting, so visuals keep up with the professor.
// It only shortens durations (never below half); it never skips a step, so
// every state change still happens in order.
export const timing = { scale: 1 };

export const scaled = (seconds) => seconds * Math.max(0.5, Math.min(1, timing.scale));