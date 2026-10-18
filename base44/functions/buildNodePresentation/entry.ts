import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SEGMENTS_SCHEMA, generateSegmentImages } from '../../shared/segmentImages.ts';

// Builds the immersive presentation for one lesson topic: an ordered list of
// spoken segments, each with its own matching picture. All pictures are
// generated before the presentation starts, so the tutor can advance the
// scene picture by picture exactly when each idea is spoken - a picture is
// never shown before it is ready and never belongs to a different idea.

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
    const nodeExample = typeof body.nodeExample === 'string' ? body.nodeExample.slice(0, 220) : '';
    const question = typeof body.question === 'string' ? body.question.slice(0, 400) : '';
    const ageRange = typeof body.ageRange === 'string' ? body.ageRange.slice(0, 60) : '';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: [
        'You write the presentation script for ONE topic of a calm, live voice tutor lesson. The tutor will speak each segment while a single matching picture is on the student\'s screen.',
        `THE STUDENT IS EXPLORING: "${question || nodeLabel}"`,
        `THE TOPIC TO PRESENT: "${nodeLabel}"${nodeDescription ? ` - ${nodeDescription}` : ''}`,
        nodeExample ? `A CONCRETE EXAMPLE TO BUILD ON: ${nodeExample}` : '',
        ageRange ? `THE STUDENT'S AGE OR GRADE RANGE: ${ageRange}` : '',
        '',
        'Write 2 to 3 segments that build this topic step by step, in the order they should be taught. Each segment needs:',
        '- idea: a very short name for this part of the topic (max 40 characters)',
        '- spokenText: exactly two or three short sentences the tutor will say for this part. Plain everyday words, warm and calm, no questions inside, max 320 characters.',
        '- imagePrompt: a description of ONE clear, concrete picture that shows exactly this part of the idea at this moment (for example: "a golden key being sealed inside a locked metal box as a padlock clicks shut").',
        'The image prompts must each show a different, specific moment of the topic so the student watches the idea unfold step by step. Never describe a picture with text or letters in it.'
      ]
        .filter(Boolean)
        .join('\n'),
      response_json_schema: SEGMENTS_SCHEMA,
      model: 'gemini_3_flash'
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
      return Response.json(
        { error: 'The presentation could not be written for this topic.' },
        { status: 502 }
      );
    }

    // Fast path: return the script now; the app fetches pictures one by one.
    if (body.textOnly === true) {
      return Response.json({
        presentation: {
          segments: segments.map((s) => ({
            idea: s.idea,
            spokenText: s.spokenText,
            imagePrompt: s.imagePrompt,
            url: null
          }))
        }
      });
    }

    // One matching picture per segment, generated together so the whole
    // presentation is ready before the tutor starts speaking.
    const withPictures = await generateSegmentImages(base44.asServiceRole.integrations, segments);

    return Response.json({ presentation: { segments: withPictures } });
  } catch (error) {
    console.log('buildNodePresentation: error', String(error?.message ?? error).slice(0, 400));
    return Response.json(
      { error: 'The presentation could not be built right now.' },
      { status: 500 }
    );
  }
}