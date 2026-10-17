import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nodeLabel = typeof body.nodeLabel === 'string' ? body.nodeLabel.trim().slice(0, 60) : '';
    if (!nodeLabel) return Response.json({ error: 'A topic is required.' }, { status: 400 });
    const nodeDescription =
      typeof body.nodeDescription === 'string' ? body.nodeDescription.slice(0, 200) : '';
    const question = typeof body.question === 'string' ? body.question.slice(0, 400) : '';
    const ageRange = typeof body.ageRange === 'string' ? body.ageRange.slice(0, 60) : '';

    const prompt = [
      'Create a calm, friendly educational illustration for a student who is stuck on this idea:',
      `"${nodeLabel}"${nodeDescription ? ` - ${nodeDescription}` : ''}.`,
      question ? `The question they are exploring: ${question}.` : '',
      ageRange ? `The student is in this age range: ${ageRange}.` : '',
      'Style: clean flat vector illustration, soft light colors, one clear central visual metaphor that makes the idea easy to understand, generous white space, absolutely no text or letters in the image, nothing scary or alarming.'
    ]
      .filter(Boolean)
      .join(' ');

    const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
    if (!result?.url) {
      return Response.json(
        { error: 'The picture could not be created. Try again in a moment.' },
        { status: 502 }
      );
    }
    return Response.json({ url: result.url });
  } catch (error) {
    console.log('generateHelpImage: error', String(error?.message ?? error).slice(0, 400));
    return Response.json(
      { error: 'The picture could not be created right now.' },
      { status: 500 }
    );
  }
}