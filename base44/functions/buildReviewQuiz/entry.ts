import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const QUESTION_ITEM = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    choices: { type: 'array', items: { type: 'string' } },
    correct_index: { type: 'integer' },
    hint: { type: 'string' },
    explanation: { type: 'string' },
    topic: { type: 'string' }
  },
  required: ['question', 'choices', 'correct_index']
};

const QUIZ_SCHEMA = {
  type: 'object',
  properties: { questions: { type: 'array', items: QUESTION_ITEM } },
  required: ['questions']
};

// Builds a cumulative review quiz from the student's saved lessons,
// weighted toward the topics they struggled with (wrong answers, repeated
// attempts, or hints used).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sessions = Array.isArray(body.sessions)
      ? body.sessions.slice(0, 6).map((s) => ({
          title: String(s?.title ?? '').slice(0, 90),
          ageRange: String(s?.ageRange ?? '').slice(0, 60),
          nodes: (Array.isArray(s?.nodes) ? s.nodes : []).slice(0, 8).map((n) => ({
            label: String(n?.label ?? '').slice(0, 60),
            description: String(n?.description ?? '').slice(0, 160),
            attempts: Number(n?.attempts) || 0,
            hints: Number(n?.hints) || 0,
            correct: !!n?.correct
          })),
          notes: (Array.isArray(s?.notes) ? s.notes : []).slice(0, 6).map((t) => String(t ?? '').slice(0, 200))
        }))
      : [];
    if (!sessions.length) {
      return Response.json({ error: 'No saved lessons to quiz yet.' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: [
        'You create a cumulative review quiz for a young student, based ONLY on the lessons they studied. Their saved session data is below.',
        `SESSIONS DATA: ${JSON.stringify(sessions)}`,
        '',
        'Write 4 to 6 multiple-choice questions covering what they studied.',
        'Weight the quiz toward topics they struggled with: wrong or repeated practice attempts, or hints used. Also include at least one easier question about a topic they already mastered, so the quiz stays encouraging.',
        'Each question needs: exactly 3 simple choices, correct_index (0, 1 or 2), a one-line hint, a one-line explanation of the correct answer, and the topic label it belongs to.',
        'Plain friendly words, no trick questions, nothing scary.'
      ].join('\n'),
      response_json_schema: QUIZ_SCHEMA
    });

    const questions = (Array.isArray(result?.questions) ? result.questions : [])
      .filter((q) => q && q.question && Array.isArray(q.choices) && q.choices.length === 3)
      .slice(0, 8)
      .map((q, i) => ({
        id: `q_${i + 1}`,
        question: String(q.question).slice(0, 220),
        choices: q.choices.map((c) => String(c).slice(0, 100)),
        correct_index: Math.min(Math.max(Number(q.correct_index) || 0, 0), 2),
        hint: String(q.hint || '').slice(0, 140),
        explanation: String(q.explanation || '').slice(0, 240),
        topic: String(q.topic || '').slice(0, 60)
      }));
    if (!questions.length) {
      return Response.json({ error: 'The review quiz could not be built right now.' }, { status: 502 });
    }
    return Response.json({ questions });
  } catch (error) {
    console.log('buildReviewQuiz: error', String(error?.message ?? error).slice(0, 400));
    return Response.json({ error: 'The review quiz could not be built right now.' }, { status: 500 });
  }
}