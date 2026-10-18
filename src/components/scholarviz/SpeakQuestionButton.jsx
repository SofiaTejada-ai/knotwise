import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createVoiceConnection } from "@/hooks/useVoiceConnection";

// Speak a question to the professor mid-lesson: tap to record, tap again to
// send. The lesson is paused first, and the transcript goes to onQuestion.
export default function SpeakQuestionButton({ disabled, onStart, onQuestion }) {
  const [state, setState] = useState("idle"); // idle | recording | sending
  const [notice, setNotice] = useState("");
  const conn = useRef(null);

  useEffect(() => () => conn.current?.cancel(), []);

  const begin = async () => {
    setNotice("");
    onStart?.();
    conn.current = createVoiceConnection({
      onTranscribed: (text) => {
        setState("idle");
        onQuestion(text);
      },
      onError: (msg) => {
        setState("idle");
        setNotice(msg);
      }
    });
    try {
      await conn.current.start();
      setState("recording");
    } catch {
      setNotice("The microphone is not available. You can type your question instead.");
    }
  };

  const finish = () => {
    setState("sending");
    conn.current?.stop();
  };

  return (
    <>
      {state === "recording" ? (
        <Button className="min-h-[44px] bg-red-600 hover:bg-red-700" onClick={finish} data-testid="speak-stop">
          <Square className="mr-1 h-4 w-4" /> Send my question
        </Button>
      ) : (
        <Button variant="outline" className="min-h-[44px]" disabled={disabled || state === "sending"} onClick={begin} data-testid="speak-question">
          {state === "sending" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Mic className="mr-1 h-4 w-4" />}
          {state === "sending" ? "Listening back..." : "Speak a question"}
        </Button>
      )}
      {notice && (
        <span className="w-full text-sm text-[#5B6478]" role="status">
          {notice}
        </span>
      )}
    </>
  );
}