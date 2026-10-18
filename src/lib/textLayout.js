// Layout helpers for native text objects (code, SQL, math, values).
// Monospace text, so each character has the same width and highlights line up.

export const TEXT_STYLES = {
  code_block: { fs: 15, bg: "#0f172a", fg: "#e2e8f0", border: "#334155", pad: 14, cols: 46 },
  math_expression: { fs: 22, bg: "#ffffff", fg: "#1B2A49", border: "#cbd5e1", pad: 12, cols: 26 },
  text_label: { fs: 15, bg: "#ffffff", fg: "#1B2A49", border: "#e2e8f0", pad: 10, cols: 30 },
  variable_value: { fs: 17, bg: "#ecfeff", fg: "#0f172a", border: "#14b8a6", pad: 10, cols: 26 },
  array_cell: { fs: 20, bg: "#ffffff", fg: "#0f172a", border: "#1B2A49", pad: 12, cols: 8 },
  expression_token: { fs: 17, bg: "#fef3c7", fg: "#0f172a", border: "#f59e0b", pad: 8, cols: 26 }
};

const KEYWORDS = new Set(
  "SELECT FROM WHERE OR AND NOT INSERT INTO VALUES UPDATE SET DELETE DROP TABLE UNION JOIN ON LIKE if else for while return const let var function def int new null true false".split(" ")
);

// Hard-wraps long lines but keeps every character and indentation.
export function layoutLines(text, cols) {
  const out = [];
  String(text ?? "")
    .split("\n")
    .forEach((ln) => {
      if (!ln.length) out.push("");
      for (let i = 0; i < ln.length; i += cols) out.push(ln.slice(i, i + cols));
    });
  return out.slice(0, 12);
}

// Character ranges of the highlighted token in one line.
export function highlightRanges(line, token) {
  if (!token) return [];
  const out = [];
  let i = line.indexOf(token);
  while (i >= 0) {
    out.push([i, i + token.length]);
    i = line.indexOf(token, i + token.length);
  }
  return out;
}

// Splits a code line into colored pieces (keywords, numbers, strings).
export function codePieces(line, fg) {
  return (line.match(/(\s+|'[^']*'?|"[^"]*"?|[A-Za-z_]+|\d+|.)/g) ?? []).map((t) => ({
    t,
    c: KEYWORDS.has(t) || KEYWORDS.has(t.toUpperCase()) ? "#93c5fd" : /^\d+$/.test(t) ? "#fca5a5" : /^['"]/.test(t) ? "#86efac" : fg
  }));
}