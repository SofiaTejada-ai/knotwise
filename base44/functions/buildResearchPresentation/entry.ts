import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SEGMENTS_SCHEMA, generateSegmentImages } from '../../shared/segmentImages.ts';

// Builds the animated presentation for ONE topic of an uploaded document:
// an ordered list of spoken segments, each with its own matching picture,
// strictly faithful to the document material. All pictures are generated
// before the professor starts speaking, so a picture is never shown before
// it is ready and never belongs to a different idea.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const docTitle = typeof body.docTitle === 'string' ? body.docTitle.trim().slice(0, 120) : '';
    const nodeLabel = typeof body.nodeLabel === 'string' ? body.nodeLabel.trim().slice(0, 60) : '';
    if (!nodeLabel) return Response.json({ error: 'A topic is required.' }, { status: 400 });
    const nodeExplanation = typeof body.nodeExplanation === 'string' ? body.nodeExplanation.slice(0, 1500) : '';
    const excerpt = typeof body.excerpt === 'string' ? body.excerpt.slice(0, 1500) : '';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_8_flash',
      prompt: [
        "You write the presentation script for ONE topic of a lesson built from a student's uploaded document. The professor will speak each segment while a single matching picture is on the student's screen.",
        `DOCUMENT: "${docTitle}"`,
        `TOPIC: "${nodeLabel}"`,
        `TOPIC EXPLANATION: ${nodeExplanation}`,
        excerpt ? `EXACT LINES FROM THE DOCUMENT: ${excerpt}` : '',
        '',
        'Write 2 to 3 segments that build this topic step by step, staying strictly faithful to the document material above. Never invent facts that are not in the material. Each segment needs:',
        '- idea: a very short name for this part of the topic (max 40 characters)',
        '- spokenText: exactly two or three short sentences the professor will say for this part. Plain everyday words, warm and calm, no questions inside, max 320 characters.',
        '- imagePrompt: a description of ONE clear, concrete picture that shows exactly this part of the idea at this moment. Never describe a picture with text or letters in it.'
      ]
        .filter(Boolean)
        .join('\n'),
      response_json_schema: SEGMENTS_SCHEMA
    });

    const segments = (Array.isArray(result?.segments) ? result.segments : [])
      .filter((s) => s && s.spokenText)
      .slice(0, 3)
      .map((s) => ({
        idea: String(s.idea || nodeLabel).slice(0, 60),
        spokenText: String(s.spokenText).slice(0, 400),
        imagePrompt: String(s.imagePrompt || s.idea || nodeLabel).slice(0, 400)
      }));
    if (!segments.length) {
      return Response.json({ error: 'The presentation could not be written for this topic.' }, { status: 502 });
    }

    const withPictures = await generateSegmentImages(base44.asServiceRole.integrations, segments);
    return Response.json({ presentation: { segments: withPictures } });
  } catch (error) {
    console.log('buildResearchPresentation: error', String(error?.message ?? error).slice(0, 400));
    return Response.json({ error: 'The presentation could not be built right now.' }, { status: 500 });
  }
}