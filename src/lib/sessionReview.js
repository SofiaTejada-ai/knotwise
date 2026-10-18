import { checkPractice } from "@/lib/practiceCheck";

// Looking back at one saved Live Tutor session: its notes grouped by topic,
// and a final review quiz built ONLY from that session. The quiz goes through
// the same grounding check as live practice questions, so nothing unrelated
// to what the student and the professor went over can appear.

export const hasContent = (s) => !!(s?.notes?.length || s?.asked?.length || s?.nodes?.length);

// Notes grouped by topic, in the order the topics came up.
export function notesByTopic(session) {
  const groups = [];
  for (const n of session?.notes ?? []) {
    let g = groups.find((x) => x.id === n.nodeId);
    if (!g) groups.push((g = { id: n.nodeId, label: n.label || "Notes", notes: [] }));
    g.notes.push(n.text);
  }
  return groups;
}

// Everything that was actually covered, as plain text (the grounding source).
export function sessionText(session) {
  const s = session ?? {};
  return [
    s.title,
    s.question,
    ...(s.documents ?? []),
    ...(s.nodes ?? []).map((n) => `${n.label} ${n.description ?? ""}`),
    ...(s.notes ?? []).map((n) => `${n.label} ${n.text}`),
    ...(s.asked ?? []).map((q) => `${q.question} ${q.choices?.[q.correct_index] ?? ""} ${q.explanation ?? ""}`),
    ...(s.examples ?? [])
  ]
    .filter(Boolean)
    .join(" ");
}

// buildReviewQuiz accepts up to 6 notes of 200 characters per session, so the
// whole session is packed into those blocks: topic notes first, then the
// practice questions and their answers.
export function quizPayload(session) {
  const lines = [
    ...notesByTopic(session).map((g) => `${g.label}: ${g.notes.join(" ")}`),
    ...(session.asked ?? []).map(
      (q) => `Practice: ${q.question} Answer: ${q.choices?.[q.correct_index] ?? ""}${q.correct ? "" : " (the student found this hard)"}`
    ),
    ...(session.examples?.length ? [`Examples used: ${session.examples.join("; ")}`] : [])
  ];
  const blocks = [];
  let cur = "";
  for (const line of lines.join(" | ").split(/(?<=\| )/)) {
    if ((cur + line).length > 200 && cur) {
      blocks.push(cur.trim());
      cur = "";
    }
    cur += line.slice(0, 200);
  }
  if (cur.trim()) blocks.push(cur.trim());
  const topics = session.nodes?.length
    ? session.nodes.map((n) => {
        const p = session.practiceLog?.[n.id];
        return { label: n.label, description: n.description, attempts: p?.attempts ?? 0, hints: p?.hints ?? 0, correct: !!p?.correct };
      })
    : notesByTopic(session).map((g) => ({ label: g.label, description: "", attempts: 0, hints: 0, correct: false }));
  return {
    title: `${session.title}${session.documents?.length ? ` (from ${session.documents.join(", ")})` : ""}`.slice(0, 90),
    ageRange: session.profile?.ageRange ?? "",
    nodes: topics,
    notes: blocks.slice(0, 6)
  };
}

// Keeps only questions grounded in this session.
export function groundQuiz(questions, session) {
  const taught = sessionText(session);
  const topic = `${session.title ?? ""} ${session.question ?? ""}`;
  return (questions ?? []).filter((q) => checkPractice(q, { taught, topic }).ok);
}
