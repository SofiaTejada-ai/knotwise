import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const audioUrl = typeof body.audio_url === "string" ? body.audio_url : "";
    if (!/^https:\/\/.+/.test(audioUrl) || audioUrl.length > 2000) {
      return Response.json({ text: "", error: "Invalid audio url" }, { status: 400 });
    }
    const result = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: audioUrl });
    let text = "";
    if (typeof result === "string") text = result;
    else if (result && typeof result === "object") text = String(result.text ?? result.transcript ?? "");
    return Response.json({ text: text.slice(0, 400) });
  } catch (error) {
    return Response.json({ text: "", error: String(error?.message ?? error) }, { status: 200 });
  }
}