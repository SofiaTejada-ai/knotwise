import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Builds one validated, source-grounded visual (timeline, comparison,
// whiteboard or sort-it) for the shared professor stage. The model only
// supplies content; the structure and the spoken steps are built here so a
// malformed answer can never reach the screen.

const KINDS = ['timeline', 'comparison', 'whiteboard', 'dragdrop'];

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: { label: { type: 'string' }, detail: { type: 'string' } },
        required: ['label', 'detail']
      }
    },
    leftTitle: { type: 'string' },
    rightTitle: { type: 'string' },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: { aspect: { type: 'string' }, left: { type: 'string' }, right: { type: 'string' } },
        required: ['aspect', 'left', 'right']
      }
    },
    lines: { type: 'array', items: { type: 'string' } },
    zones: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, title: { type: 'string' } },
        required: ['id', 'title']
      }
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, zone: { type: 'string', description: 'id of the zone it belongs to' } },
        required: ['text', 'zone']
      }
    }
  },
  required: ['title']
};

const HOW = {
  timeline: 'Fill title and events: 3 to 6 events in order, each with a short label (max 40 characters) and a one sentence detail. Leave the other fields empty.',
  comparison: 'Fill title, leftTitle, rightTitle and rows: 3 to 5 rows comparing the two things, each with a short aspect and one short sentence for left and right. Leave the other fields empty.',
  whiteboard: 'Fill title and lines: 3 to 6 short lines, like notes a teacher writes on a whiteboard, each max 90 characters, in teaching order. Leave the other fields empty.',
  dragdrop: 'Fill title, zones (exactly 2 or 3 groups with ids z1, z2, z3) and items (4 to 8 short items, max 50 characters each, each belonging to exactly one zone id). Leave the other fields empty.'
};

const t = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Signed-out visitors may use the tutor (the app is public); a signed-in user is optional.
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const kind = String(body.kind ?? '');
    if (!KINDS.includes(kind)) return Response.json({ error: 'Unknown visual type.' }, { status: 400 });
    const topic = t(body.topic, 200);
    const grounding = String(body.groundingText ?? '').slice(0, 6000);
    if (!topic) return Response.json({ error: 'No topic.' }, { status: 400 });

    const r = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_8_flash',
      prompt: [
        'You make one teaching visual for a student who learns best with calm, short, concrete wording. Use ONLY the material below. Never add outside facts.',
        `TOPIC: ${topic}`,
        `VISUAL TYPE: ${kind}. ${HOW[kind]}`,
        '',
        'MATERIAL:',
        grounding || topic
      ].join('\n'),
      response_json_schema: SCHEMA
    });

    const title = t(r?.title || topic, 80);
    let data: Record<string, unknown> | null = null;
    let steps: { narration: string }[] = [];

    if (kind === 'timeline') {
      const events = (Array.isArray(r?.events) ? r.events : [])
        .filter((e) => e?.label)
        .map((e) => ({ label: t(e.label, 40), detail: t(e.detail, 200) }))
        .slice(0, 6);
      if (events.length >= 2) {
        data = { events };
        steps = events.map((e) => ({ narration: `${e.label}. ${e.detail}` }));
      }
    } else if (kind === 'comparison') {
      const rows = (Array.isArray(r?.rows) ? r.rows : [])
        .filter((x) => x?.aspect && x?.left && x?.right)
        .map((x) => ({ aspect: t(x.aspect, 40), left: t(x.left, 160), right: t(x.right, 160) }))
        .slice(0, 5);
      const leftTitle = t(r?.leftTitle, 40);
      const rightTitle = t(r?.rightTitle, 40);
      if (rows.length >= 2 && leftTitle && rightTitle) {
        data = { leftTitle, rightTitle, rows };
        steps = rows.map((x) => ({
          narration: `${x.aspect}. ${leftTitle}: ${x.left} ${rightTitle}: ${x.right}`
        }));
      }
    } else if (kind === 'whiteboard') {
      const lines = (Array.isArray(r?.lines) ? r.lines : []).map((l) => t(l, 90)).filter(Boolean).slice(0, 6);
      if (lines.length >= 2) {
        data = { lines };
        steps = lines.map((l) => ({ narration: l }));
      }
    } else {
      const zones = (Array.isArray(r?.zones) ? r.zones : [])
        .filter((z) => z?.id && z?.title)
        .map((z) => ({ id: t(z.id, 10), title: t(z.title, 40) }))
        .slice(0, 3);
      const ids = new Set(zones.map((z) => z.id));
      const items = (Array.isArray(r?.items) ? r.items : [])
        .filter((i) => i?.text && ids.has(t(i.zone, 10)))
        .map((i, n) => ({ id: `i${n + 1}`, text: t(i.text, 50), zone: t(i.zone, 10) }))
        .slice(0, 8);
      if (zones.length >= 2 && items.length >= 3) {
        data = { zones, items };
        steps = [
          { narration: `Your turn. Drag each card into the group where it belongs: ${zones.map((z) => z.title).join(', or ')}. Take your time.` }
        ];
      }
    }

    if (!data) return Response.json({ error: 'That visual could not be built from this material.' }, { status: 502 });
    return Response.json({ visual: { kind, title, data, steps } });
  } catch (error) {
    console.log('buildVisual: error', String(error?.message ?? error).slice(0, 400));
    return Response.json({ error: 'The visual could not be built right now.' }, { status: 500 });
  }
}