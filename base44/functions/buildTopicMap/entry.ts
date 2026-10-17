import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const NODE_ITEM = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    description: { type: 'string' },
    example: { type: 'string' },
    practice: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        choices: { type: 'array', items: { type: 'string' } },
        correct_index: { type: 'integer' },
        hint: { type: 'string' },
        explanation: { type: 'string' }
      },
      required: ['question', 'choices', 'correct_index']
    }
  },
  required: ['id', 'label', 'description', 'example']
};

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    nodes: { type: 'array', items: NODE_ITEM },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: { from: { type: 'string' }, to: { type: 'string' }, label: { type: 'string' } },
        required: ['from', 'to']
      }
    },
    evidence: {
      type: 'object',
      properties: { claim: { type: 'string' }, source_name: { type: 'string' }, url: { type: 'string' } },
      required: ['claim', 'source_name', 'url']
    }
  },
  required: ['title', 'nodes', 'edges']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
    if (!question) return Response.json({ error: 'A question is required.' }, { status: 400 });
    const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 80) : '';
    const ageRange = typeof body.ageRange === 'string' ? body.ageRange.trim().slice(0, 60) : '';
    const goal = typeof body.goal === 'string' ? body.goal.trim().slice(0, 200) : '';
    const preferences = Array.isArray(body.preferences)
      ? body.preferences.filter((p) => typeof p === 'string').slice(0, 6)
      : [];

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: [
        'You design the learning map for a calm, live one-on-one voice tutor. A student asked their own question and the tutor will teach it node by node.',
        `STUDENT QUESTION: "${question}"`,
        `SUBJECT: ${subject || 'not specified'}`,
        `AGE OR GRADE RANGE: ${ageRange || 'not specified'}`,
        `GOAL: ${goal || 'not specified'}`,
        `LEARNING PREFERENCES: ${preferences.join(', ') || 'none given'}`,
        '',
        'Decide the lesson length yourself: choose the number of nodes that truly fits this topic and the student age or grade range. Use as few as 2 nodes for a small idea and up to 8 for a rich topic. Never pad the lesson with extra nodes. Order them from the first idea to the final answer.',
        'Each node needs: a short label (max 28 characters), a one-sentence description (max 120 characters, plain words), and a concrete everyday example sentence (max 22 words) that contains one key phrase worth thinking about.',
        'Each node also gets a short practice question: exactly 3 answer choices, correct_index (0, 1 or 2), a one-line hint, and a one-line explanation of the correct answer.',
        'Edges connect each node to the node it builds on, with a very short relationship label (max 20 characters).',
        'Evidence: if the topic has a well-known public source, include claim (one sentence), source_name, and url. For scam texts, phishing, or online safety use an FTC.gov or consumer.ftc.gov page. For any other topic, only include a source URL you are certain exists. If you are not certain, set evidence to null. Never invent a URL.',
        'Node ids are lowercase words with underscores.'
      ].join('\n'),
      response_json_schema: MAP_SCHEMA
    });

    const raw = result ?? {};
    const nodes = (Array.isArray(raw.nodes) ? raw.nodes : [])
      .filter((n) => n && n.label)
      .slice(0, 8)
      .map((n, i) => ({
        id: String(n.id || `node_${i + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .slice(0, 30),
        label: String(n.label).slice(0, 40),
        description: String(n.description || '').slice(0, 160),
        example: String(n.example || '').slice(0, 220),
        practice:
          n.practice && Array.isArray(n.practice.choices) && n.practice.choices.length === 3
            ? {
                question: String(n.practice.question || '').slice(0, 200),
                choices: n.practice.choices.map((c) => String(c).slice(0, 90)),
                correct_index: Math.min(Math.max(Number(n.practice.correct_index) || 0, 0), 2),
                hint: String(n.practice.hint || '').slice(0, 140),
                explanation: String(n.practice.explanation || '').slice(0, 220)
              }
            : null
      }));
    if (nodes.length < 2) {
      return Response.json(
        { error: 'The tutor could not build a map for that question. Try rephrasing it.' },
        { status: 502 }
      );
    }
    const ids = new Set(nodes.map((n) => n.id));
    const edges = (Array.isArray(raw.edges) ? raw.edges : [])
      .filter((e) => e && ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
      .slice(0, 10)
      .map((e) => ({ from: e.from, to: e.to, label: String(e.label || '').slice(0, 30) }));
    const evidence =
      raw.evidence && typeof raw.evidence.url === 'string' && raw.evidence.url.startsWith('http')
        ? {
            claim: String(raw.evidence.claim || '').slice(0, 240),
            source_name: String(raw.evidence.source_name || 'Source').slice(0, 80),
            url: raw.evidence.url.slice(0, 300)
          }
        : null;

    return Response.json({
      map: { title: String(raw.title || question).slice(0, 90), nodes, edges, evidence }
    });
  } catch (error) {
    console.log('buildTopicMap: error', String(error?.message ?? error).slice(0, 400));
    return Response.json(
      { error: 'The tutor could not build the learning map right now.' },
      { status: 500 }
    );
  }
}