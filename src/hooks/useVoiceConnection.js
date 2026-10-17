import { base44 } from "@/api/base44Client";

// Voice connection integration point for the tutoring room.
// Records the student's question with the microphone, stores it privately,
// and transcribes it through the app's backend. Swap this module to change
// how live voice input is provided; the tutoring room UI stays the same.
export function createVoiceConnection({ onTranscribed, onError }) {
  let recorder = null;
  let stream = null;
  let cancelled = false;

  return {
    async start() {
      cancelled = false;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("unsupported");
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelled) return;
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          if (blob.size < 1000) {
            onError("I did not hear anything. You can type your question instead.");
            return;
          }
          const file = new File([blob], "question.webm", { type: blob.type });
          const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
          const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 300 });
          const res = await base44.functions.invoke("transcribeQuestion", { audio_url: signed_url });
          const text = res?.data?.text ?? res?.text ?? "";
          if (text && text.trim()) onTranscribed(text.trim());
          else onError("I could not understand that. You can type your question instead.");
        } catch (err) {
          onError("Voice input is not connected yet. You can type your question instead.");
        }
      };
      recorder.start();
    },
    stop() {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
    cancel() {
      cancelled = true;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
  };
}