// Realtime session tools and professor instructions for the research route.
// The student uploaded a document; the professor presents one diagram topic
// with matching pictures, then answers questions from the material only.

import { SHOW_SEGMENT_TOOL } from "@/lib/liveTutorSession";

export const FINISH_PRESENTATION_TOOL = {
  type: "function",
  name: "finish_presentation",
  description:
    "Call this once, right after you finish speaking the last part of the topic and said your closing sentence. It returns the full lesson diagram to the student's screen.",
  parameters: {
    type: "object",
    properties: {},
    required: []
  }
};

export const RESEARCH_TOOLS = [SHOW_SEGMENT_TOOL, FINISH_PRESENTATION_TOOL];

// Bounded context the realtime session carries: what the material is and
// which topic is on screen right now.
export function researchStudentContext(map, node) {
  return [
    `The student is studying their uploaded document "${map?.title ?? ""}".`,
    map?.summary ? `Key summary: ${map.summary}` : "",
    node ? `Active topic: ${node.label}.` : "",
    node?.excerpt ? `Document lines for it: ${node.excerpt}` : ""
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 1000);
}

export function researchProfessorInstructions(map, node) {
  return `You are a calm, patient professor inside a study app. The student uploaded the document "${map?.title ?? ""}" and sees a clickable diagram of its topics. They selected the topic "${node?.label ?? ""}" to hear presented.

HOW TO PRESENT (follow this exactly):
1. Call show_segment(0) first. Never say an introduction before it: the first thing you say is the exact text the tool result gives you.
2. Say those words in your own calm voice. As you finish each part, call show_segment with the next part number and speak that part's exact words. A steady, calm pace from start to end: no questions, no long pauses.
3. After the last part's words, say one short closing sentence about the topic, then call finish_presentation and wait. The full diagram returns to the student's screen.
4. If the student interrupts during the presentation, finish the current thought, answer kindly, then continue where you left off.
5. After the presentation, the student may ask questions out loud or by typing. Answer them kindly using the document material only. If the answer is not in the material, say so honestly.
6. If the student asks to hear another topic, tell them to tap it in the diagram on screen.

STYLE: warm, patient, plain words. No jokes, no idioms, no exclamation marks.`;
}