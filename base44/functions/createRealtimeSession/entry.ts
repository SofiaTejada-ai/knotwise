import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

const MODEL = 'gpt-realtime';
const VOICE = 'marin';
// Slightly slower than normal speech: a teaching pace. If the API ever
// rejects the field, the session is created again without it.
const SPEECH_SPEED = 0.9;

const BASE_INSTRUCTIONS = `You are the live voice tutor inside Safe Steps, a calm learning app that helps students with ADHD or autism learn to spot scam text messages by practicing on example messages.

Speak like a warm, patient teacher. Improvise your answers to the student's spoken questions, keep them clear and short, and leave time for the student to respond. If it helps learning, ask at most one short follow-up question, then wait. Adapt every explanation to the student's age, the topic they are asking about, and their learning preferences given in the context. Use plain words, expand any abbreviation the first time you use it, no jokes, no idioms, no exclamation marks, no scary stories. Stay on the lesson topics: scam text messages, phishing, safe links, and how to verify a message. If a question is off topic, gently guide the student back to the lesson.`;

const UNAVAILABLE = 'I could not start the voice session right now. Please try again in a moment, or type your question instead.';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json(
        { error: 'Voice tutoring is not set up yet. Please type your question instead.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const studentContext = typeof body.studentContext === 'string' ? body.studentContext.slice(0, 1000) : '';
    // cyber8LiveTutor sessions may bring their own tutor instructions and
    // function tools. Bound and validate everything before passing it on.
    const rawInstructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';
    const instructions = rawInstructions ? rawInstructions.slice(0, 24000) : null;
    const tools = Array.isArray(body.tools)
      ? body.tools
          .filter(
            (t) =>
              t &&
              t.type === 'function' &&
              typeof t.name === 'string' &&
              /^[a-z0-9_]{1,40}$/.test(t.name) &&
              typeof t.description === 'string' &&
              t.description.length <= 500 &&
              t.parameters &&
              typeof t.parameters === 'object'
          )
          .slice(0, 48)
          .map((t) => ({
            type: 'function',
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }))
      : undefined;

    // Stable, privacy-preserving safety identifier for this app user.
    const digest = await crypto.subtle
      .digest('SHA-256', new TextEncoder().encode('safe-steps:' + user.id))
      .catch(() => null);
    const safetyId = digest
      ? Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      : null;

    const createSecret = (speed) => fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(safetyId ? { 'OpenAI-Safety-Identifier': safetyId } : {})
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: MODEL,
          instructions: instructions
            ? studentContext
              ? `${instructions}\n\nSTUDENT CONTEXT: ${studentContext}`
              : instructions
            : studentContext
              ? `${BASE_INSTRUCTIONS}\n\nSTUDENT CONTEXT: ${studentContext}`
              : BASE_INSTRUCTIONS,
          ...(tools && tools.length ? { tools } : {}),
          audio: {
            output: { voice: VOICE, ...(speed ? { speed } : {}) },
            input: {
              transcription: { model: 'whisper-1' },
              turn_detection: { type: 'server_vad' }
            }
          }
        }
      }),
      signal: AbortSignal.timeout(15000)
    });

    let openaiRes = await createSecret(SPEECH_SPEED);
    if (openaiRes.status === 400) {
      const errBody = await openaiRes.text().catch(() => "");
      console.log("createRealtimeSession: retrying without speed", errBody.slice(0, 300));
      openaiRes = await createSecret(null);
    }

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text().catch(() => "");
      console.log("createRealtimeSession: OpenAI status", openaiRes.status, errBody.slice(0, 500));
      return Response.json({ error: UNAVAILABLE }, { status: 502 });
    }

    const data = await openaiRes.json();
    const secret = data?.value ?? data?.client_secret?.value;
    if (!secret) {
      return Response.json({ error: UNAVAILABLE }, { status: 502 });
    }

    return Response.json({
      client_secret: secret,
      expires_at: data.expires_at ?? null,
      model: MODEL,
      voice: VOICE
    });
  } catch (error) {
    console.log('createRealtimeSession: error', String(error?.message ?? error).slice(0, 400));
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}