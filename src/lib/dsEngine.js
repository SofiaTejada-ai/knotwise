// Deterministic data-structure engine. The professor (the LLM) only CHOOSES an
// operation and explains it; this code executes it and produces the real
// result. The diagram and the professor's context are driven by these results.

export const MAX_ITEMS = 8;

export const KINDS = {
  queue: { ops: ["enqueue", "dequeue", "peek"], add: "enqueue", remove: "dequeue" },
  stack: { ops: ["push", "pop", "peek"], add: "push", remove: "pop" }
};

export function detectKind(text) {
  const t = String(text ?? "").toLowerCase();
  const q = /\bqueues?\b/.test(t);
  const s = /\bstacks?\b/.test(t);
  if (q && !s) return "queue";
  if (s && !q) return "stack";
  if (q && s) return t.lastIndexOf("stack") > t.lastIndexOf("queue") ? "stack" : "queue";
  return null;
}

const clean = (v) => (typeof v === "number" ? v : String(v).trim().slice(0, 8));

export function createStruct(kind, items = []) {
  if (!KINDS[kind]) throw new Error(`unsupported structure ${kind}`);
  return { kind, items: items.slice(0, MAX_ITEMS).map(clean) };
}

// Queue items run front -> rear. Stack items run bottom -> top.
export function applyOp(struct, op, value) {
  const info = KINDS[struct.kind];
  const before = [...struct.items];
  const base = { kind: struct.kind, op, value: value === undefined ? undefined : clean(value), before };
  const fail = (error) => ({ ...base, ok: false, error, struct, after: before, returned: undefined });
  if (!info || !info.ops.includes(op)) return fail("unsupported_op");
  if (op === info.add) {
    if (value === undefined || value === null || String(value).trim() === "") return fail("value_required");
    if (before.length >= MAX_ITEMS) return fail("full");
    const after = [...before, base.value];
    return { ...base, ok: true, struct: { ...struct, items: after }, after, returned: undefined };
  }
  if (op === info.remove) {
    if (!before.length) return fail("empty");
    // queue removes the oldest (front); stack removes the newest (top)
    const returned = struct.kind === "queue" ? before[0] : before[before.length - 1];
    const after = struct.kind === "queue" ? before.slice(1) : before.slice(0, -1);
    return { ...base, ok: true, struct: { ...struct, items: after }, after, returned };
  }
  // peek: reads, never changes
  if (!before.length) return fail("empty");
  const returned = struct.kind === "queue" ? before[0] : before[before.length - 1];
  return { ...base, ok: true, struct, after: before, returned };
}

// What the diagram shows. Queue cells read front -> rear (left to right).
// A stack draws its TOP first, so the newest value is at the top of the box.
export const displayItems = (kind, items) => (kind === "stack" ? [...items].reverse() : [...items]).map(String);

export const opLabel = (r) => `${r.op}(${r.value !== undefined && (r.op === KINDS[r.kind].add) ? r.value : ""})`;

export function summarize(struct) {
  const { kind, items } = struct;
  const list = `[${items.join(", ")}]`;
  if (kind === "queue") {
    return items.length
      ? `Queue (front to rear): ${list}. Front is ${items[0]}, rear is ${items[items.length - 1]}, size ${items.length}.`
      : "Queue is empty: []. There is no front or rear.";
  }
  return items.length
    ? `Stack (bottom to top): ${list}. Top is ${items[items.length - 1]}, bottom is ${items[0]}, size ${items.length}.`
    : "Stack is empty: []. There is no top.";
}

export const RULES = {
  queue:
    "A queue is First In, First Out (FIFO): enqueue adds at the REAR, dequeue removes from the FRONT, so the oldest value leaves first.",
  stack:
    "A stack is Last In, First Out (LIFO): push and pop both work at the TOP, so the newest value leaves first."
};

export const COMPLEXITY = {
  queue:
    "Time: with a linked list or a circular buffer, enqueue and dequeue are O(1). A naive array that shifts every element on dequeue is O(n), so it depends on the implementation.",
  stack: "Time: with an array (growing at the end) or a linked list, push and pop are O(1). An occasional array resize is amortized O(1)."
};

// Plain-language result of one operation, built from the REAL computed state.
export function explainResult(r) {
  const { kind, op } = r;
  const where = kind === "queue" ? { add: "rear", remove: "front" } : { add: "top", remove: "top" };
  if (!r.ok) {
    const why = {
      empty: `The ${kind} is empty, so ${op}() has nothing to ${op === "peek" ? "read" : "remove"}. Nothing changed (this is ${kind === "queue" ? "underflow" : "stack underflow"}).`,
      full: `The diagram holds at most ${MAX_ITEMS} values, so ${op}(${r.value}) was refused. Nothing changed.`,
      value_required: `${op}() needs a value. Nothing changed.`,
      unsupported_op: `${op} is not an operation of a ${kind}. Nothing changed.`
    };
    return why[r.error] || "Nothing changed.";
  }
  if (op === KINDS[kind].add) return `${op}(${r.value}) added ${r.value} at the ${where.add}.`;
  if (op === KINDS[kind].remove)
    return `${op}() removed and returned ${r.returned} from the ${where.remove}${
      kind === "queue" ? ` (the oldest value, so it leaves first)` : ` (the newest value, so it leaves first)`
    }.`;
  return `peek() read ${r.returned} at the ${kind === "queue" ? "front" : "top"} without removing it.`;
}

// The opening example. The professor's instructions quote these exact values,
// so the first words and the first picture always agree.
export const DEFAULT_EXAMPLE = { items: [3, 7], value: 12 };

// The value the student asked to add ("pushing 73 onto a stack"), if any, so
// the planned demo uses the student's number instead of the default.
export function requestedValue(text) {
  const m = String(text ?? "").match(/\b(?:push|enqueue|add|insert)(?:ing|ed|es|s)?\b\D{0,20}?(-?\d+(?:\.\d+)?)/i);
  return m ? Number(m[1]) : undefined;
}

export const defaultExampleText = (kind, value = DEFAULT_EXAMPLE.value) =>
  kind === "queue"
    ? `Queue (front to rear): [3, 7]. Plan: enqueue(${value}), enqueue(${value === 25 ? 40 : 25}), peek(), dequeue(), dequeue().`
    : `Stack (bottom to top): [3, 7]. Plan: push(${value}), push(${value === 25 ? 40 : 25}), peek(), pop(), pop().`;

let counter = 0;
export function buildDsScene(kind, items, value = DEFAULT_EXAMPLE.value) {
  const start = items && items.length ? items : DEFAULT_EXAMPLE.items;
  const struct = createStruct(kind, start);
  const q = kind === "queue";
  const id = `${kind}_${Date.now().toString(36)}_${counter++}`;
  const second = value === 25 ? 40 : 25;
  const objects = q
    ? [
        { id: "incoming", type: "plate", label: "enqueue at rear", x: 780, y: 275 },
        { id: "struct", type: "queue", label: "Queue", x: 450, y: 275, items: displayItems(kind, struct.items) },
        { id: "outgoing", type: "plate", label: "dequeue at front", x: 120, y: 275 },
        { id: "status", type: "note", label: "Ready", x: 450, y: 385 }
      ]
    : [
        { id: "gate", type: "plate", label: "push / pop at top", x: 450, y: 80 },
        { id: "struct", type: "stack", label: "Stack", x: 450, y: 300, items: displayItems(kind, struct.items) },
        { id: "status", type: "note", label: "Ready", x: 760, y: 300 }
      ];
  const rule = RULES[kind];
  const sequence = q
    ? [
        { step: 1, action: "pulse", target: "struct", duration: 1, description: `This is the queue. ${rule}` },
        { step: 2, action: "pulse", target: "incoming", duration: 1, description: "New values enter at the rear, on the right." },
        { step: 3, action: "pulse", target: "outgoing", duration: 1, description: "Values leave from the front, on the left." }
      ]
    : [
        { step: 1, action: "pulse", target: "struct", duration: 1, description: `This is the stack. ${rule}` },
        { step: 2, action: "pulse", target: "gate", duration: 1, description: "Values enter and leave only at the top." }
      ];
  return {
    scene_id: id,
    title: q ? "How a queue works" : "How a stack works",
    objects,
    sequence,
    ds: {
      kind,
      structId: "struct",
      inId: q ? "incoming" : "gate",
      outId: q ? "outgoing" : "gate",
      statusId: "status",
      initial: [...struct.items],
      // Long enough to teach the rule, not just show it: two adds, a read,
      // then removals that reveal the order (and the second value leaving).
      plan: q
        ? [{ op: "enqueue", value }, { op: "enqueue", value: second }, { op: "peek" }, { op: "dequeue" }, { op: "dequeue" }]
        : [{ op: "push", value }, { op: "push", value: second }, { op: "peek" }, { op: "pop" }, { op: "pop" }]
    }
  };
}

// Built-in self checks, run from the preview during development.
export function runSelfTests() {
  const results = [];
  const t = (name, ok) => results.push({ name, ok: !!ok });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let q = createStruct("queue", [10, 20, 30]);
  const e = applyOp(q, "enqueue", 40);
  t("queue enqueue appends at rear (FIFO order)", same(e.after, [10, 20, 30, 40]));
  t("enqueue does not mutate the input structure", same(q.items, [10, 20, 30]));
  const d = applyOp(e.struct, "dequeue");
  t("queue dequeue returns the oldest element", d.returned === 10 && same(d.after, [20, 30, 40]));
  t("queue peek reads front without removing", same(applyOp(d.struct, "peek").after, [20, 30, 40]) && applyOp(d.struct, "peek").returned === 20);
  const eq = applyOp(createStruct("queue", []), "dequeue");
  t("empty dequeue is safe", eq.ok === false && eq.error === "empty" && same(eq.after, []));
  let s = createStruct("stack", [10, 20, 30]);
  const p = applyOp(s, "push", 40);
  t("stack push places value on top", same(p.after, [10, 20, 30, 40]) && p.struct.items[3] === 40);
  const o = applyOp(p.struct, "pop");
  t("stack pop returns the newest element", o.returned === 40 && same(o.after, [10, 20, 30]));
  const es = applyOp(createStruct("stack", []), "pop");
  t("empty pop is safe", es.ok === false && es.error === "empty");
  t("stack never behaves like a queue", applyOp(createStruct("stack", [1, 2, 3]), "pop").returned === 3 && applyOp(createStruct("queue", [1, 2, 3]), "dequeue").returned === 1);
  t("stack displays top first", same(displayItems("stack", [10, 20, 30]), ["30", "20", "10"]));
  const again = applyOp(e.struct, "dequeue");
  t("repeating the same op on the same state is pure (replay applies nothing twice)", same(again.after, d.after) && same(e.struct.items, [10, 20, 30, 40]));
  t("unsupported op is refused", applyOp(q, "push", 1).ok === false);
  t("reads the student's value", requestedValue("Show me how pushing 73 onto a stack works") === 73 && requestedValue("what is a stack") === undefined);
  t("detects queue and stack topics", detectKind("teach me how a queue works") === "queue" && detectKind("what about a stack instead") === "stack");
  return results;
}