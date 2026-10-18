import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nodeLabel = clip(body.nodeLabel, 80);
    if (!nodeLabel) return Response.json({ error: 'A node label is required.' }, { status: 400 });
    const nodeType = clip(body.nodeType, 40);
    const sceneTitle = clip(body.sceneTitle, 120);
    const question = clip(body.question, 300);
    const detail = clip(body.detail, 300);
    const first = body.first === true;

    const imagePrompt = [
      `Create an accurate, technically correct educational illustration of the REAL subject: "${nodeLabel}"${nodeType ? ` (${nodeType})` : ''}`,
      sceneTitle ? `within the topic "${sceneTitle}".` : '.',
      detail ? `Context: ${detail}.` : '',
      question ? `The student asked: ${question}.` : '',
      'Show the actual mechanism, structure, system or data involved (for software: real components, code or query structure, data flow; for biology: real anatomy, cells or structures; for math: the actual graph or equation; for physics: the actual forces or system).',
      'Do NOT draw a metaphor, cartoon objects, locks, keys, filing cabinets or symbolic stand-ins.',
      'Style: clean labeled technical diagram, light background, a few short readable labels at most, wide landscape composition, nothing scary.'
    ]
      .filter(Boolean)
      .join(' ');

    const imageP = base44.asServiceRole.integrations.Core.GenerateImage({ prompt: imagePrompt });
    const metaP = first
      ? base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Give ONE very short, friendly analogy sentence (max 18 words) that helps a student orient themselves before learning about "${nodeLabel}"${sceneTitle ? ` in the topic "${sceneTitle}"` : ''}. Start with "Think of it like". No technical terms, no dashes.`,
          response_json_schema: {
            type: 'object',
            properties: { metaphor: { type: 'string' } },
            required: ['metaphor']
          }
        })
      : Promise.resolve(null);

    const [img, meta] = await Promise.allSettled([imageP, metaP]);
    const url = img.status === 'fulfilled' ? img.value?.url : undefined;
    const metaphor = meta.status === 'fulfilled' ? meta.value?.metaphor : undefined;
    if (!url && !metaphor) {
      return Response.json({ error: 'The picture could not be created.' }, { status: 502 });
    }
    return Response.json({ url, metaphor });
  } catch (error) {
    console.log('generateNodeImage: error', String((error as Error)?.message ?? error).slice(0, 400));
    return Response.json({ error: 'The picture could not be created right now.' }, { status: 500 });
  }
}