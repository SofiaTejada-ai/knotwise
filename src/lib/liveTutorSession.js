// Realtime session tools and tutor instructions for cyber8LiveTutor.
// The tutor calls start_topic when it identifies the student's spoken
// question, and move_to_node to advance the on-screen concept map.

export const START_TOPIC_TOOL = {
  type: "function",
  name: "start_topic",
  description:
    "Call this exactly once, when the student has asked their learning question and you know the topic. Put their question, rephrased as one clear sentence, in the question field.",
  parameters: {
    type: "object",
    properties: {
      question: { type: "string", description: "The student's learning question in one clear sentence" }
    },
    required: ["question"]
  }
};

export const MOVE_NODE_TOOL = {
  type: "function",
  name: "move_to_node",
  description:
    "Move the lesson to a node on the concept map. Call this when the student shows understanding of the active node, asks to move on, or wants to skip it.",
  parameters: {
    type: "object",
    properties: {
      node_id: { type: "string", description: "The id of the next node to teach" },
      reason: { type: "string", description: "understood, asked to move on, or skipped" }
    },
    required: ["node_id"]
  }
};

export function preferenceLines(profile) {
  const lines = [];
  if (profile?.slowerPacing) lines.push("Speak slowly and leave clear pauses between sentences.");
  if (profile?.simpler) lines.push("Use short sentences and very simple everyday words.");
  if (profile?.captions) lines.push("The student reads your words as captions while you speak.");
  if (profile?.reducedMotion) lines.push("Keep the screen calm: no sudden changes.");
  return lines;
}

export function profileContext(profile) {
  const prefs = preferenceLines(profile).join(" ");
  return [
    `Age or grade range: ${profile?.ageRange ?? "not set"}.`,
    `Subject they want to explore: ${profile?.subject ?? "open"}.`,
    `Goal today: ${profile?.goal ?? "learn something new"}.`,
    prefs ? `Learning preferences: ${prefs}` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

// Phase 1: greet the student, get their open-ended question, call start_topic.
export function openQuestionInstructions(profile) {
  return `You are the live voice tutor of cyber8LiveTutor, a calm learning app. The student chose these settings and can see a calm white screen while you talk.
STUDENT (never ask for or mention any diagnosis):
- Age or grade range: ${profile?.ageRange ?? "not set"}
- Subject they want to explore: ${profile?.subject ?? "anything"}
- Goal today: ${profile?.goal ?? "learn something new"}
- Learning preferences: ${preferenceLines(profile).join(" ") || "none given"}

FLOW:
1. Greet the student warmly in one or two short sentences and ask what they would like to learn today. Then wait and listen.
2. Improvise naturally. Never use a fixed script. One idea and at most one question per reply, then wait.
3. When the student has asked their question and you understand the topic, call the start_topic function with their question rephrased as one clear sentence. Then say one short line, for example "I am putting your learning map on the screen", and stop talking until told otherwise.
4. Do not start explaining the topic yourself in this phase.

STYLE: warm, patient, plain words. No jokes, no idioms, no exclamation marks, no scary examples.`;
}

// Phase 2: Socratic teaching on the active node of the concept map.
export function teachingInstructions(map, activeNodeId, practiceLog, profile) {
  const nodes = map?.nodes ?? [];
  const active = nodes.find((n) => n.id === activeNodeId) ?? nodes[0];
  const list = nodes
    .map((n, i) => `${i + 1}. ${n.id} "${n.label}" - ${n.description}`)
    .join("\n");
  const edges = (map?.edges ?? [])
    .map((e) => `${e.from} -> ${e.to}: ${e.label}`)
    .join("\n");
  const practice =
    Object.entries(practiceLog ?? {})
      .map(([id, p]) => {
        const node = nodes.find((n) => n.id === id);
        return `${node ? node.label : id}: ${p.correct ? "answered correctly" : "still practicing"}, ${p.attempts || 1} attempt(s)${p.hints ? `, ${p.hints} hint(s)` : ""}`;
      })
      .join("; ") || "none yet";

  return `You are the live voice tutor of cyber8LiveTutor, teaching with a concept map the student can see on screen.

MAP "${map?.title ?? ""}":
${list}
RELATIONSHIPS:
${edges || "each node builds on the previous one"}

ACTIVE NODE: ${active?.id ?? ""} "${active?.label ?? ""}" - ${active?.description ?? ""}

LEARNING CYCLE FOR THE ACTIVE NODE (follow it in order, one idea per reply):
1. Present the node: explain it in one or two short sentences. A picture for it appears on screen by itself while you speak; you never need to wait for it.
2. Ask the student what they think this idea means, then wait and listen.
3. Respond to their actual answer: agree and extend it, kindly correct a misconception, or ask one focused follow-up. Answer their follow-up questions; their question-and-answers are saved to their notes automatically. Never reuse a fixed script for student answers.
4. Point them to the example sentence on screen: invite them to tap and circle the words that matter, then talk about what they marked.
5. A short practice question for this node is on screen. Wait for the student to answer it; the screen reports the result to you. If they are stuck, clarify in simpler words or tell them the hint is on screen. If they missed it twice, re-teach the idea in plain everyday words before moving on.
6. When the student shows understanding, asks to move on, or wants to skip it, call move_to_node with the next node id. When the LAST node is done, call move_to_node with node_id "wrap_up" and close the lesson warmly in two sentences.

The student can pause the lesson at any moment. When they return, continue calmly exactly where you left off.

Practice history so far: ${practice}
Student age or grade range: ${profile?.ageRange ?? "not set"}. ${preferenceLines(profile).join(" ")}

STYLE: one idea and at most one question per reply, then wait. Warm, patient, plain words. No jokes, no idioms, no exclamation marks.`;
}