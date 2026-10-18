import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Builds a LITERAL technical diagram plus a step-by-step teaching script for
// one topic: real components, relationships and processes, never a metaphor
// (unless the student asked for an analogy). No image generation is involved,
// so it returns in a few seconds and the professor never waits for pictures.

const KINDS = ['client', 'attacker', 'server', 'database', 'process', 'data', 'result', 'concept'];

const SCHEMA = {
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          kind: { type: 'string', enum: KINDS }
        },
        required: ['id', 'label', 'kind']
      }
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          label: { type: 'string' }
        },
        required: ['id', 'from', 'to']
      }
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          idea: { type: 'string' },
          spokenText: { type: 'string' },
          nodes: { type: 'array', items: { type: 'string' } },
          edges: { type: 'array', items: { type: 'string' } },
          callout: {
            type: 'object',
            properties: {
              lines: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    text: { type: 'string' },
                    mark: { type: 'string' },
                    tone: { type: 'string', enum: ['neutral', 'danger', 'safe'] }
                  },
                  required: ['text']
                }
              },
              note: { type: 'string' }
            }
          }
        },
        required: ['idea', 'spokenText', 'nodes', 'edges']
      }
    }
  },
  required: ['nodes', 'edges', 'steps']
};

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nodeLabel = clip(body.nodeLabel, 80);
    if (!nodeLabel) return Response.json({ error: 'A topic is required.' }, { status: 400 });
    const nodeDescription = clip(body.nodeDescription, 240);
    const question = clip(body.question, 400);
    const ageRange = clip(body.ageRange, 60);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: [
        'You design ONE literal technical teaching diagram plus a spoken script for a live voice professor. The professor speaks each step while the matching parts of the diagram light up.',
        `THE STUDENT IS EXPLORING: "${question || nodeLabel}"`,
        `THE TOPIC TO DIAGRAM: "${nodeLabel}"${nodeDescription ? ` - ${nodeDescription}` : ''}`,
        ageRange ? `THE STUDENT'S AGE OR GRADE RANGE: ${ageRange}` : '',
        '',
        'VISUAL PRIORITY (follow strictly):',
        '1. Literal technical diagram of the real components, relationships, processes and mechanisms.',
        '2. Show what changes when an action happens (data flowing, a value changing, a state changing).',
        '3. Accurate scientific or mathematical representation for the subject.',
        '4. Metaphors or analogies ONLY if the student explicitly asked for an analogy. Never use drawers, locks, keys, boxes, treasure chests or similar symbolic objects.',
        '',
        'SUBJECT RULES:',
        '- Cybersecurity: clients, attackers, servers, databases, requests, packets, authentication flows, permissions, attack paths.',
        '- Computer science: real algorithm steps, data structures, memory, execution flow, system components.',
        '- Biology: real structures, cells, molecules, physiological stages.',
        '- Physics: forces, motion, energy, fields, measurable quantities.',
        '- Mathematics: equations, graphs, geometric relationships, step-by-step transformations.',
        '- History: ordered documented events, places, causes and effects.',
        '',
        'OUTPUT:',
        `- nodes: 4 to 8 real components or stages. id like "n1". label max 28 characters, a real technical name. kind is one of ${KINDS.join(', ')} (attacker only for a malicious actor, database for stored data, server for processing services, client for users or devices, process for operations or stages, data for inputs or values, result for outcomes, concept otherwise).`,
        '- edges: 3 to 9 arrows between node ids showing the real flow or relationship. id like "e1". label max 20 characters (what travels along it).',
        '- steps: 4 to 6 in teaching order. Each: idea (max 40 chars), spokenText (two or three short plain sentences, max 320 chars, no questions), nodes (ids lit up while speaking this step), edges (ids lit up).',
        '- Where a concrete artifact helps (an actual query, packet fields, an equation, a formula, a value), add a callout with lines. mark is the exact substring of text to highlight. tone danger for harmful or wrong, safe for correct or protected, neutral otherwise. When a safe vs unsafe comparison is the point, give two lines.',
        'Every node and edge must be used by at least one step. Every id in a step must exist in nodes or edges.'
      ]
        .filter(Boolean)
        .join('\n'),
      response_json_schema: SCHEMA,
      model: 'gemini_3_flash'
    });

    const nodes = (Array.isArray(result?.nodes) ? result.nodes : [])
      .filter((n) => n && n.id && n.label)
      .slice(0, 8)
      .map((n) => ({
        id: clip(n.id, 20),
        label: clip(n.label, 40),
        kind: KINDS.includes(n.kind) ? n.kind : 'concept'
      }));
    const edges = (Array.isArray(result?.edges) ? result.edges : [])
      .filter((e) => e && e.id && e.from && e.to)
      .slice(0, 10)
      .map((e) => ({ id: clip(e.id, 20), from: clip(e.from, 20), to: clip(e.to, 20), label: clip(e.label, 28) }));
    const segments = (Array.isArray(result?.steps) ? result.steps : [])
      .filter((s) => s && s.spokenText)
      .slice(0, 6)
      .map((s) => ({
        idea: clip(s.idea || nodeLabel, 60),
        spokenText: clip(s.spokenText, 400),
        nodes: (Array.isArray(s.nodes) ? s.nodes : []).map((x) => clip(x, 20)),
        edges: (Array.isArray(s.edges) ? s.edges : []).map((x) => clip(x, 20)),
        callout: s.callout && Array.isArray(s.callout.lines) && s.callout.lines.length
          ? {
              lines: s.callout.lines.slice(0, 3).map((l) => ({
                label: clip(l.label, 40),
                text: clip(l.text, 160),
                mark: clip(l.mark, 80),
                tone: ['danger', 'safe'].includes(l.tone) ? l.tone : 'neutral'
              })),
              note: clip(s.callout.note, 160)
            }
          : null
      }));

    if (!segments.length || !nodes.length) {
      return Response.json({ error: 'The diagram could not be written for this topic.' }, { status: 502 });
    }
    return Response.json({ presentation: { visual: { nodes, edges }, segments } });
  } catch (error) {
    console.log('buildNodePresentation: error', String(error?.message ?? error).slice(0, 400));
    return Response.json({ error: 'The diagram could not be built right now.' }, { status: 500 });
  }
}