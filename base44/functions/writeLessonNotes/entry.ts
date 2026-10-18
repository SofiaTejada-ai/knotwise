import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Notes Agent: quietly turns one student-tutor exchange (or a topic's key
// idea, when no conversation was captured) into a single concise study note
// attached to the node. Called in the background; it never interrupts the
// live voice lesson.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Signed-out visitors may use the tutor (the app is public); a signed-in user is optional.
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const nodeLabel = typeof body.nodeLabel === 'string' ? body.nodeLabel.trim().slice(0, 60) : '';
    if (!nodeLabel) return Response.json({ error: 'A topic is required.' }, { status: 400 });
    const question = typeof body.question === 'string' ? body.question.slice(0, 200) : '';
    const nodeDescription = typeof body.nodeDescription === 'string' ? body.nodeDescription.slice(0, 200) : '';
    const exchange = typeof body.exchange === 'string' ? body.exchange.slice(0, 1200) : '';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: [
        'You are the Notes Agent of a calm tutoring app for young students. You quietly record what was learned so the student can re-read it later.',
        `Lesson question: "${question}".`,
        `Topic of this note: "${nodeLabel}"${nodeDescription ? ` - ${nodeDescription}` : ''}.`,
        exchange ? `What the student and the tutor said: ${exchange}` : 'No conversation was captured for this topic yet.',
        '',
        'Write ONE concise study note, maximum 30 words, in plain friendly words a student can re-read later.',
        exchange
          ? "Capture the student's question or idea and the tutor's answer in your own words."
          : 'Summarize the key idea of this topic in one sentence.',
        'Never mention agents, notes systems, or any diagnosis. Output only the note text.'
      ].join('\n'),
      response_json_schema: {
        type: 'object',
        properties: { note: { type: 'string' } },
        required: ['note']
      }
    });

    const note = typeof result?.note === 'string' ? result.note.trim().slice(0, 300) : '';
    if (!note) {
      return Response.json({ error: 'The note could not be written right now.' }, { status: 502 });
    }
    return Response.json({ note });
  } catch (error) {
    console.log('writeLessonNotes: error', String(error?.message ?? error).slice(0, 400));
    return Response.json({ error: 'The note could not be written right now.' }, { status: 500 });
  }
}