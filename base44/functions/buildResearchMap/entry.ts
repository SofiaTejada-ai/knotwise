import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Turns an uploaded document into a source-grounded lesson diagram: a title,
// a key summary, 4-6 clickable topics (each with a deeper explanation, the
// exact document lines it is based on, and a short quiz) and the topic
// connections. The Mermaid chart is built deterministically from the topics
// and edges, so it always renders and its node ids are always n1, n2, ...

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string', description: 'Key summary of the whole material in 4 to 6 short sentences, using only the material' },
    bullets: {
      type: 'array',
      items: { type: 'string', description: 'One short bullet point, max 140 characters' },
      description: '5 to 7 bullet point summary of the whole material, using only the material'
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short step name, max 50 characters' },
          detail: { type: 'string', description: 'One or two sentences about this step' }
        },
        required: ['title', 'detail']
      },
      description: '4 to 7 step by step walk through of how to apply or follow the material, in order'
    },
    finalQuiz: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          choices: { type: 'array', items: { type: 'string' }, description: 'Exactly 4 short answer choices' },
          correctIndex: { type: 'number', description: '0, 1, 2 or 3' },
          explanation: { type: 'string', description: 'One or two sentences on why the correct choice is right' },
          basedOn: { type: 'string', description: 'Where the question comes from: a topic name, "summary" or "steps"' }
        },
        required: ['question', 'choices', 'correctIndex', 'explanation', 'basedOn']
      },
      description: 'Exactly 5 questions drawn from the topics, the bullet summary and the steps together'
    },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Very short topic name, max 24 characters' },
          shape: {
            type: 'string',
            enum: ['concept', 'process', 'decision', 'data', 'event', 'result'],
            description: 'concept = an idea or definition, process = an action or method, decision = a choice or question, data = information or evidence stored, event = something that happens, result = an outcome or conclusion'
          },
          explanation: { type: 'string', description: 'A deeper explanation of this topic in 4 to 8 short sentences, using only the material' },
          excerpt: { type: 'string', description: 'The exact key sentences from the material this topic is based on, max 900 characters' },
          quiz: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              choices: { type: 'array', items: { type: 'string' }, description: 'Exactly 3 short answer choices' },
              correctIndex: { type: 'number', description: 'Index of the correct choice: 0, 1 or 2' },
              explanation: { type: 'string', description: 'One or two sentences on why the correct choice is right' }
            },
            required: ['question', 'choices', 'correctIndex', 'explanation']
          }
        },
        required: ['label', 'shape', 'explanation', 'excerpt', 'quiz']
      }
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'number', description: 'Number of the topic this connection starts from (1 for the first topic)' },
          to: { type: 'number', description: 'Number of the topic this connection points to' }
        },
        required: ['from', 'to']
      }
    }
  },
  required: ['title', 'summary', 'bullets', 'steps', 'finalQuiz', 'nodes', 'edges']
};

// Each kind of idea gets its own Mermaid shape and color.
const SHAPES = {
  concept: { open: '("', close: '")', color: '#e0e7ff', stroke: '#6366f1' },
  process: { open: '(["', close: '"])', color: '#d1fae5', stroke: '#10b981' },
  decision: { open: '{"', close: '"}', color: '#fef3c7', stroke: '#f59e0b' },
  data: { open: '[("', close: '")]', color: '#cffafe', stroke: '#06b6d4' },
  event: { open: '{{"', close: '"}}', color: '#fce7f3', stroke: '#ec4899' },
  result: { open: '[["', close: '"]]', color: '#ede9fe', stroke: '#8b5cf6' }
};

const clean = (s, max) =>
  String(s ?? '')
    .replace(/["[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const materialTitle = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : 'Uploaded material';
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 30000) : '';
    if (text.length < 40) {
      return Response.json(
        { error: 'The document does not have enough readable text to build a lesson.' },
        { status: 400 }
      );
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_8_flash',
      prompt: [
        'You turn a student uploaded document into a lesson diagram. Use ONLY the material below. Never add outside facts. If the material is missing something, leave it out.',
        `DOCUMENT TITLE: ${materialTitle}`,
        '',
        'Create 4 to 6 topics that cover the material in a sensible learning order. Each topic needs:',
        '- label: a very short name for the topic (max 24 characters)',
        '- explanation: a deeper explanation of the topic in 4 to 8 short sentences, grounded in the material only',
        '- excerpt: the exact key sentences from the material the topic is based on (max 900 characters, copied from the material)',
        '- quiz: one short factual question with exactly 3 choices, answerable from the material alone',
        '- shape: the kind of idea it is (concept, process, decision, data, event or result), so the diagram shape matches its meaning. Use at least 3 different shapes when the material allows.',
        'Also write: bullets (5 to 7 short bullet points summarizing the whole material), steps (4 to 7 ordered step by step instructions or stages from the material), and finalQuiz (exactly 5 multiple choice questions with exactly 4 choices each, built from the topics, the bullet summary and the steps together, with basedOn saying which one each question uses).',
        'Also give 3 to 8 connections between the topics as edges: from and to are topic numbers, 1 for the first topic. Connect the topics so the diagram shows how the material builds up.',
        '',
        'MATERIAL:',
        text
      ].join('\n'),
      response_json_schema: MAP_SCHEMA
    });

    const rawNodes = (Array.isArray(result?.nodes) ? result.nodes : [])
      .filter((n) => n && n.label && n.explanation)
      .slice(0, 8);
    if (rawNodes.length < 2) {
      return Response.json({ error: 'The lesson diagram could not be built from this material.' }, { status: 502 });
    }

    const nodes = rawNodes.map((n, i) => {
      const quiz = n.quiz ?? {};
      const choices = Array.isArray(quiz.choices) ? quiz.choices.map((c) => clean(c, 160)).slice(0, 3) : [];
      const ci = Number(quiz.correctIndex);
      return {
        id: `n${i + 1}`,
        label: clean(n.label, 24),
        shape: SHAPES[n.shape] ? n.shape : 'concept',
        explanation: String(n.explanation ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 1200),
        excerpt: String(n.excerpt ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 900),
        quiz:
          choices.length === 3 && Number.isInteger(ci) && ci >= 0 && ci <= 2
            ? {
                question: String(quiz.question ?? '').slice(0, 300),
                choices,
                correctIndex: ci,
                explanation: String(quiz.explanation ?? '').slice(0, 400)
              }
            : null
      };
    });

    // The diagram always flows through the topics in order, plus any extra
    // meaningful connections the material suggests.
    const count = nodes.length;
    const seen = new Set();
    const edges = [];
    const push = (from, to) => {
      const key = `${from}-${to}`;
      if (from >= 1 && from <= count && to >= 1 && to <= count && from !== to && !seen.has(key)) {
        seen.add(key);
        edges.push({ from, to });
      }
    };
    (Array.isArray(result?.edges) ? result.edges : []).forEach((e) => {
      const from = Math.round(Number(e?.from));
      const to = Math.round(Number(e?.to));
      push(from, to);
    });
    for (let i = 1; i < count; i++) push(i, i + 1);

    const lines = ['flowchart TD'];
    nodes.forEach((n) => lines.push(`${n.id}${SHAPES[n.shape].open}${n.label}${SHAPES[n.shape].close}`));
    edges.slice(0, 12).forEach((e) => lines.push(`n${e.from} --> n${e.to}`));
    Object.entries(SHAPES).forEach(([name, s]) =>
      lines.push(`classDef ${name} fill:${s.color},stroke:${s.stroke},stroke-width:3px,color:#1e293b`)
    );
    nodes.forEach((n) => lines.push(`class ${n.id} ${n.shape}`));
    lines.push('linkStyle default stroke:#94a3b8,stroke-width:2px');

    const bullets = (Array.isArray(result?.bullets) ? result.bullets : [])
      .map((b) => String(b ?? '').replace(/\s+/g, ' ').trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 8);
    const steps = (Array.isArray(result?.steps) ? result.steps : [])
      .filter((s) => s && s.title)
      .map((s) => ({
        title: String(s.title).replace(/\s+/g, ' ').trim().slice(0, 80),
        detail: String(s.detail ?? '').replace(/\s+/g, ' ').trim().slice(0, 400)
      }))
      .slice(0, 8);
    const finalQuiz = (Array.isArray(result?.finalQuiz) ? result.finalQuiz : [])
      .map((q) => {
        const choices = Array.isArray(q?.choices) ? q.choices.map((c) => clean(c, 160)).slice(0, 4) : [];
        const ci = Number(q?.correctIndex);
        if (!q?.question || choices.length < 3 || !Number.isInteger(ci) || ci < 0 || ci >= choices.length) return null;
        return {
          question: String(q.question).slice(0, 300),
          choices,
          correctIndex: ci,
          explanation: String(q.explanation ?? '').slice(0, 400),
          basedOn: String(q.basedOn ?? '').slice(0, 40)
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    return Response.json({
      map: {
        title: String(result?.title || materialTitle).slice(0, 120),
        summary: String(result?.summary ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 900),
        mermaid: lines.join('\n'),
        bullets,
        steps,
        finalQuiz,
        nodes
      }
    });
  } catch (error) {
    console.log('buildResearchMap: error', String(error?.message ?? error).slice(0, 400));
    return Response.json({ error: 'The lesson diagram could not be built right now.' }, { status: 500 });
  }
}