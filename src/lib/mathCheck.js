// Checks that an equation walkthrough is valid: every step must still hold
// for the final solutions (e.g. x = ±2 must satisfy x^2 - 4 = 0 and x^2 = 4).
// A tiny parser (numbers, x, + - * / ^, parentheses, implicit multiplication);
// nothing is evaluated dynamically.

export const prettyMath = (s) =>
  String(s ?? "")
    .replace(/\^2(?![0-9])/g, "²")
    .replace(/\^3(?![0-9])/g, "³")
    .replace(/\+\/-|\+-/g, "±")
    .replace(/sqrt/g, "√");

function compile(src) {
  const s = String(src)
    .replace(/\s+/g, "")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/[−–]/g, "-")
    .replace(/[·×]/g, "*");
  let i = 0;
  const peek = () => s[i];
  const atom = () => {
    if (peek() === "(") {
      i++;
      const v = expr();
      if (s[i++] !== ")") throw new Error("paren");
      return v;
    }
    if (peek() === "x") {
      i++;
      return (x) => x;
    }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error("token");
    i += m[0].length;
    const n = Number(m[0]);
    return () => n;
  };
  const power = () => {
    const b = atom();
    if (peek() !== "^") return b;
    i++;
    const e = unary();
    return (x) => Math.pow(b(x), e(x));
  };
  const unary = () => {
    if (peek() === "-") {
      i++;
      const u = unary();
      return (x) => -u(x);
    }
    if (peek() === "+") i++;
    return power();
  };
  const term = () => {
    let v = unary();
    for (;;) {
      const c = peek();
      const l = v;
      if (c === "*" || c === "/") {
        i++;
        const r = unary();
        v = c === "*" ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
      } else if (c && /[0-9x(]/.test(c)) {
        const r = unary();
        v = (x) => l(x) * r(x);
      } else return v;
    }
  };
  const expr = () => {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const l = v;
      const r = term();
      v = op === "+" ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
    }
    return v;
  };
  const f = expr();
  if (i !== s.length) throw new Error("rest");
  return f;
}

const equation = (text) => {
  const parts = String(text).split("=");
  if (parts.length !== 2) return null;
  try {
    const L = compile(parts[0]);
    const R = compile(parts[1]);
    return (x) => L(x) - R(x);
  } catch {
    return null;
  }
};

const solutions = (text) => {
  const m = /^\s*x\s*=\s*(.+)$/.exec(String(text));
  if (!m) return [];
  const out = [];
  m[1].split(/,|\bor\b/).forEach((piece) => {
    const p = piece.replace(/x\s*=/, "").trim();
    const pm = p.startsWith("±");
    try {
      const v = compile(pm ? p.slice(1) : p)(0);
      if (Number.isFinite(v)) out.push(...(pm ? [v, -v] : [v]));
    } catch {
      /* not a plain number */
    }
  });
  return out;
};

// Returns { ok, checked, badStep? }. Steps that are not plain equations in x
// (such as "f(x) = x² - 4") are skipped, never rejected.
export function checkSteps(expressions) {
  const sols = solutions(expressions[expressions.length - 1]);
  if (!sols.length) return { ok: true, checked: 0 };
  let checked = 0;
  for (let k = 0; k < expressions.length; k++) {
    const eq = equation(expressions[k]);
    if (!eq) continue;
    checked++;
    for (const x of sols) if (Math.abs(eq(x)) > 1e-6) return { ok: false, checked, badStep: k + 1, x };
  }
  return { ok: true, checked };
}