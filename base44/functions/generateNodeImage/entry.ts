import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    // Signed-out visitors may use the tutor (the app is public); a signed-in user is optional.
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const nodeLabel = clip(body.nodeLabel, 80);
    if (!nodeLabel) return Response.json({ error: 'A node label is required.' }, { status: 400 });
    const nodeType = clip(body.nodeType, 40);
    const sceneTitle = clip(body.sceneTitle, 120);
    const question = clip(body.question, 300);
    const detail = clip(body.detail, 300);
    const first = body.first === true;

    const imagePrompt = [
      `Create a clean, visually appealing educational illustration depicting "${nodeLabel}"${nodeType ? ` (a ${nodeType})` : ''}${detail ? `, where the current action is: ${detail.slice(0, 120)}` : ''}, in the context of ${sceneTitle || question || 'the lesson'}.`,
      'Show one clear primary subject or action.',
      'Use a straightforward, recognizable depiction of the real subject, for example a person at a computer for a user or attacker, a server rack for a server, a database cylinder with stored records for a database.',
      'Do not create an infographic, diagram, flowchart, presentation slide, collage, or multi-panel illustration.',
      'Do not include large headings, paragraphs, arrows, code blocks, tables, or dense labels. Use no text at all unless one or two words are essential.',
      'Keep the composition simple and readable at a glance: modern clean illustration, minimal light background, wide landscape framing, friendly and not scary.',
      'The image will appear above an existing interactive technical diagram, so it should supplement the diagram rather than duplicate it. Do not make it a metaphor.'
    ].join(' ');

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