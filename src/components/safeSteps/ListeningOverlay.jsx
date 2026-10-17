import React from "react";
import { Button } from "@/components/ui/button";
import TutorCharacter from "./TutorCharacter";

const STATUS_TEXT = {
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Not connected",
};

const STATUS_GUIDANCE = {
  connecting: "Getting the tutor's attention. This takes a moment.",
  listening: "Go ahead, ask me anything. You can pause any time. I am listening.",
  thinking: "Give me a moment to think about your words.",
  speaking: "I am answering. You can start talking at any time and I will stop and listen.",
  error: "You can try again, or close this and type your question instead.",
};

export default function ListeningOverlay({ status, userText, tutorText, error, onRetry, onEnd }) {
  const label = STATUS_TEXT[status] ?? "";
  return (
    <div className="fixed inset-0 z-50 bg-white">
      {status === "listening" && <span className="ss-square" aria-hidden="true" />}
      <div className="mx-auto max-w-md space-y-5 px-4 pt-24 text-center">
        <div className={status === "thinking" ? "ss-thinking flex justify-center" : "flex justify-center"}>
          <TutorCharacter state={status} />
        </div>
        <p className="text-xl font-medium text-slate-800">{label}</p>
        <p className="text-base leading-relaxed text-slate-600">{STATUS_GUIDANCE[status] ?? ""}</p>
        {userText && (
          <p className="rounded-2xl bg-slate-100 px-4 py-2 text-base text-slate-700">You said: {userText}</p>
        )}
        {tutorText && (
          <div
            aria-live="polite"
            className="rounded-2xl border px-4 py-3 text-left text-base leading-relaxed text-slate-700"
            style={{ borderColor: status === "speaking" ? "var(--ss-accent)" : "#e2e8f0" }}
          >
            {tutorText}
          </div>
        )}
        {error && (
          <div className="space-y-3">
            <p className="text-base leading-relaxed text-slate-600">{error}</p>
            <div className="flex justify-center gap-3">
              <Button size="lg" onClick={onRetry}>
                Try again
              </Button>
              <Button size="lg" variant="outline" onClick={onEnd}>
                Close
              </Button>
            </div>
          </div>
        )}
        {!error && (
          <div className="flex justify-center gap-3">
            <Button size="lg" variant="outline" onClick={onEnd}>
              End session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}