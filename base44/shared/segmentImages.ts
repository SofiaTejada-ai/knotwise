// Shared presentation helpers for the live tutor and research routes: one
// calm, text-free picture per spoken segment, generated in parallel so the
// whole presentation is ready before the professor starts speaking.

export const SEGMENTS_SCHEMA = {
  type: 'object',
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          idea: { type: 'string' },
          spokenText: { type: 'string' },
          imagePrompt: { type: 'string' }
        },
        required: ['idea', 'spokenText', 'imagePrompt']
      }
    }
  },
  required: ['segments']
};

export async function generateSegmentImages(integrations, segments) {
  const images = await Promise.allSettled(
    segments.map((s) =>
      integrations.Core.GenerateImage({
        prompt: `${s.imagePrompt}. Style: clean flat vector illustration, soft light colors, one clear central visual metaphor, generous white space, absolutely no text or letters in the image, nothing scary or alarming.`
      })
    )
  );
  return segments.map((s, i) => ({
    idea: s.idea,
    spokenText: s.spokenText,
    url: images[i].status === 'fulfilled' && images[i].value?.url ? String(images[i].value.url) : null
  }));
}