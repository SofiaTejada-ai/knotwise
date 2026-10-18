// Realtime session tools and tutor instructions for cyber8LiveTutor.
// The lesson is one immersive scene: the tutor presents each topic segment by
// segment, and every spoken segment has its own matching picture that the
// tutor puts on screen exactly when it reaches that idea.

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

export const SHOW_SEGMENT_TOOL = {
  type: "function",
  name: "show_segment",
  description:
    "Put the picture for one part of the presentation on the student's screen. Call this immediately before you speak that part. The tool result tells you the exact words to say.",
  parameters: {
    type: "object",
    properties: {
      segment_index: { type: "number", description: "The part to show, starting at 0" }
    },
    required: ["segment_index"]
  }
};

export const CONFIRM_UNDERSTANDING_TOOL = {
  type: "function",
  name: "confirm_understanding",
  description:
    "Report the student's answer to your check question. Call this after the student answers your question 'Does that make sense?'. Set understood true only if they really understood. If they are still confused, set understood false and put what confused them in the confusion field.",
  parameters: {
    type: "object",
    properties: {
      understood: { type: "boolean" },
      confusion: { type: "string", description: "If they are confused: the part they found confusing, in a few words" }
    },
    required: ["understood"]
  }
};

export const MOVE_NODE_TOOL = {
  type: "function",
  name: "move_to_node",
  description:
    "Move the lesson to the next topic. Call this after the student answered the practice correctly and you praised them, or when the student asks to move on or to skip. After the last topic, call it with node_id 'wrap_up'. After calling it, stay silent until its result arrives.",
  parameters: {
    type: "object",
    properties: {
      node_id: { type: "string", description: "The id of the next topic to teach" },
      reason: { type: "string", description: "understood, asked to move on, or skipped" }
    },
    required: ["node_id"]
  }
};

const idParam = (d) => ({ type: "string", description: d });
const tool = (name, description, properties = {}, required = []) => ({
  type: "function",
  name,
  description,
  parameters: { type: "object", properties, required }
});

// Visual commands the professor uses to direct the animated diagram.
export const DIRECTOR_TOOLS = [
  tool("focus_node", "Zoom the camera into one part of the diagram and show its simple picture above it.", { node_id: idParam("Part id from the diagram list") }, ["node_id"]),
  tool("show_overview", "Zoom out to show the complete diagram."),
  tool("highlight_node", "Pulse one part to point at the concept you are naming.", { node_id: idParam("Part id") }, ["node_id"]),
  tool("follow_connection", "Move the camera along the arrow from one part to the next.", { from_id: idParam("Source part id"), to_id: idParam("Destination part id") }, ["from_id", "to_id"]),
  tool(
    "animate_transfer",
    "Send a short value, request or packet along the arrow from one part into another. The camera follows it. Afterwards call update_node_state to show how the destination changed.",
    { from_id: idParam("Source part id"), to_id: idParam("Destination part id"), value: idParam("Short label of what travels, up to 24 characters") },
    ["from_id", "to_id", "value"]
  ),
  tool(
    "update_node_state",
    "Visibly change what is inside a part (its items, value or label). Call it right after a value arrives, or when a part's contents change.",
    {
      node_id: idParam("Part id"),
      props: {
        type: "object",
        description: "New contents: items (list of short strings), value, or label",
        properties: { items: { type: "array", items: { type: "string" } }, value: { type: "string" }, label: { type: "string" } }
      }
    },
    ["node_id", "props"]
  ),
  tool("play_step", "Play one numbered teaching step of the diagram (starting at 1). The camera follows it. The result arrives when it has finished.", { step_id: { type: "number", description: "Step number, starting at 1" } }, ["step_id"]),
  tool("pause_visuals", "Freeze the animation exactly where it is."),
  tool("resume_visuals", "Continue the animation from where it was frozen.")
];

// Added to the tutor instructions: the professor directs the camera.
export const DIRECTOR_RULES = `
DIRECTING THE ANIMATED DIAGRAM (when show_segment(0) lists the diagram's parts, these rules replace steps 1-3 above):
- You are the director. The student never clicks anything. Narrate in one short sentence what is about to happen, THEN call the visual command, so speech and animation run together.
- Start: call show_segment(0). It shows the whole diagram, zooms the camera into the first part and lists part ids and numbered steps. Give the one short metaphor it provides (first part only), then explain that part.
- Then move through the lesson with play_step(1), play_step(2), and so on. Use animate_transfer to send a value along an arrow, update_node_state right after it arrives to show what changed in the destination (and in the source if it changes), follow_connection or focus_node to move attention, show_overview to step back, highlight_node to point at something.
- Every tool result tells you the visual has FINISHED. Then explain why the state changed. Only use part ids from the list. Never describe something that has not appeared yet.
- If the student interrupts, answer them directly and calmly. The picture stays exactly as it is. Continue from the current state; never restart or repeat earlier steps. Call resume_visuals only if you paused the visuals yourself.`;

export function preferenceLines(profile) {
  const lines = [];
  if (profile?.slowerPacing) lines.push("Speak slowly and leave clear pauses between sentences.");
  if (profile?.simpler) lines.push("Use short sentences and very simple everyday words.");
  if (profile?.captions) lines.push("The student reads your words as a quiet caption while you speak.");
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
  return `You are the live voice tutor of cyber8LiveTutor, a calm learning app. The student chose these settings and sees a calm white screen while you talk.
STUDENT (never ask for or mention any diagnosis):
- Age or grade range: ${profile?.ageRange ?? "not set"}
- Subject they want to explore: ${profile?.subject ?? "anything"}
- Goal today: ${profile?.goal ?? "learn something new"}
- Learning preferences: ${preferenceLines(profile).join(" ") || "none given"}

FLOW:
1. Greet the student warmly in one or two short sentences and ask what they would like to learn today. Then wait and listen.
2. Improvise naturally. Never use a fixed script. One idea and at most one question per reply, then wait.
3. When the student has asked their question and you understand the topic, call the start_topic function with their question rephrased as one clear sentence. The tool result will tell you to begin explaining at once. Do exactly that: never wait, and never say that anything is being prepared.
4. Do not start explaining the topic yourself in this phase.

STYLE: warm, patient, plain words. No jokes, no idioms, no exclamation marks, no scary examples.`;
}

// Phase 2: the immersive lesson. The student sees one calm scene: a single
// picture that shows the idea being spoken, then the practice quiz.
// Used while the detailed outline is still being built in the background:
// the professor starts teaching from the student's question at once.
export function streamingInstructions(question, profile) {
  const base = teachingInstructions(
    { nodes: [{ id: "opening", label: question, description: "the student's question" }] },
    "opening",
    {},
    profile
  );
  return `${base}

RIGHT NOW: the student asked "${question}". Start explaining immediately in your own plain words; the diagram is being drawn alongside you and the detailed steps arrive in a moment. If the student speaks, answer conversationally and never mention preparing anything.`;
}

export function teachingInstructions(map, activeNodeId, practiceLog, profile) {
  const nodes = map?.nodes ?? [];
  const active = nodes.find((n) => n.id === activeNodeId) ?? nodes[0];
  const list = nodes
    .map((n, i) => `${i + 1}. ${n.id} "${n.label}" - ${n.description}`)
    .join("\n");
  const practice =
    Object.entries(practiceLog ?? {})
      .map(([id, p]) => {
        const node = nodes.find((n) => n.id === id);
        return `${node ? node.label : id}: ${p.correct ? "answered correctly" : "still practicing"}, ${p.attempts || 1} attempt(s)${p.hints ? `, ${p.hints} hint(s)` : ""}`;
      })
      .join("; ") || "none yet";

  return `You are the live voice tutor of cyber8LiveTutor. The student sees one calm scene: a literal technical diagram (real components and arrows) whose parts light up as you explain each step.

LESSON TOPICS (in teaching order):
${list}

ACTIVE TOPIC: ${active?.id ?? ""} "${active?.label ?? ""}" - ${active?.description ?? ""}

HOW TO PRESENT THE ACTIVE TOPIC (follow this exactly):
1. Call show_segment(0) to put the first picture on screen. You may say one short natural sentence first, then say the exact words the tool result gives you for that part. Never say that anything is being prepared. If the tool result says the diagram is still being drawn, explain the idea in your own plain words, then call show_segment(0) again.
2. Say those words in your own calm voice. As you finish speaking, call show_segment(1) to bring up the next picture, and continue like this until the last part.
3. Keep speaking through the whole presentation: no questions, no long pauses, no summaries yet. A steady, calm pace from start to end.
4. After the last part's words, ask exactly: "Does that make sense?" Then stop and listen to the student's answer.
5. Judge honestly and call confirm_understanding: understood true only if the student really understood. If they did not, put what confused them in the confusion field.
6. If the tool result says the practice quiz is on screen: read the question aloud exactly, tell the student they can tap or circle their answer on screen, then wait. The screen reports what the student did. Praise a correct answer in one short sentence, then call move_to_node with the next topic id and stay silent until its result arrives. If they missed, encourage them to try again without revealing the answer. If they missed twice, re-teach the idea in very simple everyday words, then invite them to try the last choice.
7. If the student interrupts or asks a follow-up, answer it conversationally, then continue from the current part. Never restart the presentation. If the screen reports the student tapped a part of the diagram, explain that part briefly.
8. After the LAST topic is done, call move_to_node with node_id "wrap_up" and close the lesson warmly in two sentences.

${DIRECTOR_RULES}

Practice history so far: ${practice}
Student age or grade range: ${profile?.ageRange ?? "not set"}. ${preferenceLines(profile).join(" ")}

STYLE: warm, patient, plain words. No jokes, no idioms, no exclamation marks.`;
}