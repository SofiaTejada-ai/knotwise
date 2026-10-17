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

YOUR JOB ON THE ACTIVE NODE (Socratic tutoring):
1. First ask the student aloud what they think this idea means, then wait and listen.
2. Respond to their actual answer: agree and extend it, kindly correct a misconception, or recognize a partly correct answer and ask one focused follow-up. Never reuse a fixed script for student answers.
3. Keep this node active until the student shows understanding, asks to move on, or wants to skip it. If the student is stuck, simplify the explanation and give one concrete everyday example.
4. The screen sometimes reports the student's practice results to you. Use them to make your spoken questions easier or harder as fitting.
5. When it is time for the next node, call move_to_node with that node's id. When the LAST node is understood or the student is done, call move_to_node with node_id "wrap_up" and close the lesson warmly in two sentences.

Practice history so far: ${practice}
Student age or grade range: ${profile?.ageRange ?? "not set"}. ${preferenceLines(profile).join(" ")}

STYLE: one idea and at most one question per reply, then wait. Warm, patient, plain words. No jokes, no idioms, no exclamation marks.`;
}