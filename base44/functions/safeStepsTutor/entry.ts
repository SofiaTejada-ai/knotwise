import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const SYSTEM_PROMPT = "You are a calm teacher for students with ADHD or autism. Rewrite the scripted reply to fit this student. Rules: at most 2 short sentences in total. Use literal words only: no jokes, sarcasm, idioms, or exclamation marks. Never say 'wrong'; always say what to look at next. Never change whether an answer is correct: the scripted reply decides that. Only use facts from the flag data and claims given to you. If the student asks something the claims do not cover, say: 'I do not know. I can only answer from the sources in this lesson.' Name the flag only by the exact words in the message.";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
    const arr = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
    const context = {
      action: str(body.action, 40),
      scripted_reply: arr(body.scripted_lines, 6).map((l) => str(l, 600)),
      flags_found: arr(body.found, 6).map((f) => str(f, 4)),
      flags_revealed: arr(body.revealed, 6).map((f) => str(f, 4)),
      flags_missed: arr(body.missed, 6).map((f) => str(f, 4)),
      quiz_scenario:
        body.scenario && typeof body.scenario === "object"
          ? { context: str(body.scenario.context, 300), message: str(body.scenario.message, 400) }
          : null,
      quiz_answer: str(body.answer, 20) || null,
      student_question: str(body.question, 300) || null,
      flag_data: arr(body.flags, 8).map((f) =>
        f && typeof f === "object"
          ? { id: str(f.id, 4), text: str(f.text, 120), hint: str(f.hint, 200), why: str(f.why, 300), claim: str(f.claim, 300) }
          : null
      )
    };
    const prompt =
      SYSTEM_PROMPT +
      "\n\nLesson data (JSON):\n" +
      JSON.stringify(context) +
      '\n\nReturn JSON: { "lines": [one or two short strings], "show_evidence": one of "F1","F2","F3","F4","F5","stat" or null }';
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          lines: { type: "array", items: { type: "string" }, maxItems: 2 },
          show_evidence: {
            anyOf: [{ type: "string", enum: ["F1", "F2", "F3", "F4", "F5", "stat"] }, { type: "null" }]
          }
        },
        required: ["lines", "show_evidence"]
      }
    });
    const lines = Array.isArray(result?.lines) ? result.lines.slice(0, 2).map((l) => String(l).slice(0, 400)) : null;
    const ev = ["F1", "F2", "F3", "F4", "F5", "stat"].includes(result?.show_evidence) ? result.show_evidence : null;
    return Response.json({ lines, show_evidence: ev });
  } catch (error) {
    return Response.json({ lines: null, show_evidence: null, error: String(error?.message ?? error) }, { status: 200 });
  }
}