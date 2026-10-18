import { search, tokenize } from "@/lib/documentRag";

// Practice questions are written live by the professor, never prepared in
// advance. Before one reaches the screen, this check makes sure it is a
// well-formed multiple-choice question AND that it is grounded in something
// the student actually has: the uploaded material, what the professor taught
// in this lesson, or the lesson's topic and goal. Anything else (an unrelated
// everyday scenario, a topic never discussed) is refused, so the professor
// has to write a question about the real lesson.

const MIN_SHARED = 2; // distinct content words the question must share with a source

const words = (text) => new Set(tokenize(text).filter((w) => w.length > 2));
const shared = (a, b) => [...a].filter((w) => b.has(w));

export function checkPractice(q, { doc = null, taught = "", topic = "" } = {}) {
  const question = String(q?.question ?? "").trim();
  const choices = Array.isArray(q?.choices) ? q.choices.map((c) => String(c ?? "").trim()) : [];
  const correct = Number(q?.correct_index);
  if (question.length < 8) return { ok: false, error: "write a complete question." };
  if (choices.length !== 3 || choices.some((c) => !c)) return { ok: false, error: "give exactly 3 non-empty answer choices." };
  if (new Set(choices.map((c) => c.toLowerCase())).size !== 3) return { ok: false, error: "the 3 choices must be different." };
  if (![0, 1, 2].includes(correct)) return { ok: false, error: "correct_index must be 0, 1 or 2." };

  // What the question is about: its wording plus the correct answer.
  const asked = words(`${question} ${choices[correct]}`);

  // 1) The uploaded material: the best matching passage must share the
  //    question's key words.
  if (doc) {
    const hit = search(doc.index, `${question} ${choices[correct]}`, 1)[0];
    const common = hit ? shared(asked, words(`${hit.title} ${hit.text}`)) : [];
    if (hit && common.length >= MIN_SHARED) return { ok: true, basis: "document", source: hit.locator, matched: common };
  }
  // 2) What was taught in this lesson (the professor's words, the diagram,
  //    the active example).
  const fromLesson = shared(asked, words(taught));
  if (fromLesson.length >= MIN_SHARED) return { ok: true, basis: "lesson", matched: fromLesson };
  // 3) The lesson's own topic and goal (the general idea the professor wants
  //    the student to learn).
  const fromTopic = shared(asked, words(topic));
  if (fromTopic.length >= 1 && fromLesson.length + fromTopic.length >= MIN_SHARED)
    return { ok: true, basis: "topic", matched: [...new Set([...fromLesson, ...fromTopic])] };

  return {
    ok: false,
    error: `this question is not about the lesson. It must test what you actually taught${doc ? ` or what "${doc.name}" says` : ""}, using the same terms and examples, not a new unrelated scenario.`
  };
}
