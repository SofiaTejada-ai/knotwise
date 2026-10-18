// Plain rule functions for the function graph lesson. No AI, no eval.

const FORMULAS = {
  linear: (p, x) => p.a * x + p.b,
  quadratic: (p, x) => p.a * x * x,
  exponential: (p, x) => p.a * Math.pow(p.b, x),
  sine: (p, x) => p.a * Math.sin(x)
};

export function evaluate(formula, params, x) {
  const fn = FORMULAS[formula];
  return fn ? fn(params, x) : NaN;
}

export function roundTo(n, digits) {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

export function formatNumber(n) {
  return String(roundTo(n, 2));
}

export function equationText(formula, p) {
  if (formula === "linear") {
    const sign = p.b < 0 ? "-" : "+";
    return `y = ${formatNumber(p.a)}x ${sign} ${formatNumber(Math.abs(p.b))}`;
  }
  if (formula === "quadratic") return `y = ${formatNumber(p.a)}x²`;
  if (formula === "exponential") return `y = ${formatNumber(p.a)} × ${formatNumber(p.b)}^x`;
  return `y = ${formatNumber(p.a)} sin(x)`;
}

export function makeTicks(min, max, step) {
  const ticks = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) ticks.push(roundTo(t, 6));
  return ticks;
}

// Turns what the student typed into a number, or null if it is not one.
export function parseGuess(text) {
  const cleaned = String(text ?? "").trim().replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function differenceFrom(guess, actual) {
  return Math.abs(guess - actual);
}

// Professor replies: short templates that quote the student's own numbers.
export function predictionReply(guess, actual) {
  return `You guessed ${formatNumber(guess)} and the curve is at ${formatNumber(actual)}. Try the slider and watch what changes.`;
}

export function sliderReply(key, before, after, x, newValue) {
  return `You moved ${key} from ${formatNumber(before)} to ${formatNumber(after)}. At x = ${formatNumber(x)} the curve is now at ${formatNumber(newValue)}.`;
}

export function isCorrect(question, choiceIndex) {
  return choiceIndex === question.correctIndex;
}

// Review spacing: 1, 2, 4, then 7 days after each miss. Returns YYYY-MM-DD.
export function nextReviewDate(missCount, from = new Date()) {
  const days = [1, 2, 4, 7][Math.min(Math.max(missCount, 1), 4) - 1];
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Logs the event for testing and also broadcasts it on the window.
export function emitInteractionEvent(event) {
  console.log("InteractionEvent", event);
  window.dispatchEvent(new CustomEvent("interaction-event", { detail: event }));
}