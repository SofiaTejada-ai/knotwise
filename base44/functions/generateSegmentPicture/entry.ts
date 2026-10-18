import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// One calm, text-free picture for a single spoken segment.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const imagePrompt = typeof body.imagePrompt === 'string' ? body.imagePrompt.trim().slice(0, 400) : '';
    if (!imagePrompt) return Response.json({ error: 'A description is required.' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt: `${imagePrompt}. Style: clean flat vector illustration, soft light colors, one clear central visual metaphor, generous white space, absolutely no text or letters in the image, nothing scary or alarming.`
    });
    if (!result?.url) return Response.json({ error: 'No picture.' }, { status: 502 });
    return Response.json({ url: String(result.url) });
  } catch (error) {
    console.log('generateSegmentPicture: error', String(error?.message ?? error).slice(0, 400));
    return Response.json({ error: 'The picture could not be created right now.' }, { status: 500 });
  }
}