import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

// Live two-way voice session with the tutor, using the OpenAI Realtime API
// over WebRTC. Every session state (listening, thinking, speaking, error)
// comes from the realtime event stream, never from timers.
export function useRealtimeVoice() {
  const [status, setStatus] = useState("idle"); // idle | connecting | listening | thinking | speaking | error
  const [error, setError] = useState(null);
  const [userTranscript, setUserTranscript] = useState("");
  const [tutorText, setTutorText] = useState("");
  // Increments the moment the student starts talking (server VAD), long
  // before the transcript arrives. Used to cancel queued visuals on barge-in.
  const [bargeIns, setBargeIns] = useState(0);
  const [lastServerError, setLastServerError] = useState(null);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const micRef = useRef(null);
  const audioRef = useRef(null);
  const onToolCallRef = useRef(null);
  // Response gating: only one model response may be active at a time, so
  // response.create is held until the active one is done and every function
  // call it emitted has been answered.
  const responseActiveRef = useRef(false);
  const openCallsRef = useRef(new Set()); // call ids emitted but not answered yet
  const wantResponseRef = useRef(null); // null | { instructions? }
  const awaitingCreatedRef = useRef(false);

  const cleanup = useCallback(() => {
    const dc = dcRef.current;
    if (dc) {
      try {
        dc.close();
      } catch (err) {}
    }
    dcRef.current = null;
    const pc = pcRef.current;
    if (pc) {
      try {
        pc.close();
      } catch (err) {}
    }
    pcRef.current = null;
    const mic = micRef.current;
    if (mic) mic.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }, []);

  // Release the microphone, peer connection and audio element when the
  // student ends the session or leaves the page.
  useEffect(() => cleanup, [cleanup]);

  // Send a raw realtime client event over the data channel.
  const sendEvent = useCallback((payload) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") {
      try {
        dc.send(JSON.stringify(payload));
      } catch (err) {}
    }
  }, []);

  // Sends the held response.create once nothing else is in flight.
  const flushResponse = useCallback(() => {
    const want = wantResponseRef.current;
    if (!want || responseActiveRef.current || awaitingCreatedRef.current || openCallsRef.current.size) return;
    wantResponseRef.current = null;
    awaitingCreatedRef.current = true; // cleared by response.created or an error
    sendEvent({ type: "response.create", ...(want.instructions ? { response: { instructions: want.instructions } } : {}) });
  }, [sendEvent]);

  const answerCall = useCallback(
    (callId, output) => {
      sendEvent({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: callId, output: String(output ?? "") }
      });
      openCallsRef.current.delete(callId);
      if (!wantResponseRef.current) wantResponseRef.current = {};
      flushResponse();
    },
    [sendEvent, flushResponse]
  );

  const handleEvent = useCallback((ev) => {
    const type = ev?.type ?? "";
    if (type === "session.created" || type === "session.updated") {
      setStatus((s) => (s === "connecting" ? "listening" : s));
    } else if (type === "input_audio_buffer.speech_started") {
      // Barge-in: the student started talking. Stop tutor playback and listen.
      audioRef.current?.pause();
      setTutorText("");
      setUserTranscript("");
      setStatus("listening");
      setBargeIns((n) => n + 1);
    } else if (type === "input_audio_buffer.speech_stopped") {
      setStatus("thinking");
    } else if (type === "conversation.item.input_audio_transcription.completed") {
      const text = typeof ev.transcript === "string" ? ev.transcript.trim() : "";
      if (text) setUserTranscript(text);
    } else if (type === "response.created") {
      responseActiveRef.current = true;
      awaitingCreatedRef.current = false;
      audioRef.current?.play().catch(() => {});
      setStatus((s) => (s === "listening" ? s : "thinking"));
    } else if (type === "response.audio.delta" || type === "response.output_audio.delta") {
      audioRef.current?.play().catch(() => {});
      setStatus((s) => (s === "listening" ? s : "speaking"));
    } else if (type === "response.audio_transcript.delta" || type === "response.output_audio_transcript.delta") {
      const delta = typeof ev.delta === "string" ? ev.delta : "";
      setTutorText((t) => (delta ? (t + delta).slice(0, 1200) : t));
      setStatus((s) => (s === "listening" ? s : "speaking"));
    } else if (type === "response.output_item.done") {
      // A real function call from the tutor (tools configured on the session).
      const item = ev.item;
      if (item && item.type === "function_call") {
        let args = {};
        try {
          args = JSON.parse(item.arguments || "{}");
        } catch (err) {}
        setStatus("thinking");
        const callId = item.call_id;
        openCallsRef.current.add(callId);
        // Every call gets exactly one output, even if the handler throws or
        // forgets, so the professor is never left waiting in silence.
        Promise.resolve()
          .then(() => onToolCallRef.current?.({ name: item.name, arguments: args, call_id: callId }))
          .catch((err) => console.warn("[realtime] tool handler failed", item.name, err))
          .finally(() => {
            if (openCallsRef.current.has(callId)) answerCall(callId, `Not done: ${item.name} returned no result.`);
          });
      }
    } else if (type === "response.done") {
      responseActiveRef.current = false;
      setStatus("listening");
      flushResponse();
    } else if (type === "error") {
      // Server error events are almost always about one client event (a bad
      // session.update, a response.create while one is active) and the
      // session stays open, so report them instead of declaring the voice lost.
      const e = ev.error ?? {};
      console.warn("[realtime] server error", e.type, e.code, e.param, e.message, e.event_id);
      setLastServerError({ code: e.code ?? null, param: e.param ?? null, message: e.message ?? "", at: Date.now() });
      awaitingCreatedRef.current = false;
      if (e.code === "conversation_already_has_active_response") {
        responseActiveRef.current = true;
        if (!wantResponseRef.current) wantResponseRef.current = {};
      }
    }
  }, [answerCall, flushResponse]);

  const start = useCallback(
    async (studentContext, sessionConfig = {}) => {
      cleanup();
      setError(null);
      setUserTranscript("");
      setTutorText("");
      setStatus("connecting");
      setLastServerError(null);
      onToolCallRef.current = sessionConfig.onToolCall ?? null;
      responseActiveRef.current = false;
      awaitingCreatedRef.current = false;
      openCallsRef.current = new Set();
      wantResponseRef.current = null;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("unsupported");
        }
        // 1. Microphone permission.
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        micRef.current = mic;

        // 2. Fresh short-lived client secret from the app's backend.
        const res = await base44.functions.invoke("createRealtimeSession", {
          studentContext,
          instructions: sessionConfig.instructions || undefined,
          tools: sessionConfig.tools || undefined
        });
        const data = res?.data ?? {};
        const token = data.client_secret;
        if (!token) throw new Error("connection");

        // 3. WebRTC connection to OpenAI Realtime.
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        pc.onconnectionstatechange = () => {
          if (pcRef.current === pc && pc.connectionState === "failed") {
            setError("I lost the voice connection. You can try again or type your question instead.");
            setStatus("error");
          }
        };

        const audioEl = new Audio();
        audioEl.autoplay = true;
        audioRef.current = audioEl;
        const remoteStream = new MediaStream();
        audioEl.srcObject = remoteStream;
        // The tutor's audio track only exists once the connection answers,
        // so attach it when it arrives. Reading the receivers earlier gives
        // an empty stream and the tutor is never heard.
        pc.ontrack = (e) => {
          remoteStream.addTrack(e.track);
          audioEl.play().catch(() => {});
        };
        mic.getTracks().forEach((t) => pc.addTrack(t, mic));

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.onmessage = (e) => {
          try {
            handleEvent(JSON.parse(e.data));
          } catch (err) {}
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST",
          body: offer.sdp,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/sdp" }
        });
        if (!sdpRes.ok) throw new Error("connection");
        await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
        // The state moves to listening on the session.created event.
      } catch (err) {
        cleanup();
        setStatus("error");
        if (err?.name === "NotAllowedError") {
          setError("I need permission to use your microphone. Allow the microphone, then try again. You can also type your question instead.");
        } else if (err?.name === "NotFoundError") {
          setError("I could not find a microphone on this device. You can type your question instead.");
        } else {
          setError("I could not start the voice session. You can try again or type your question instead.");
        }
      }
    },
    [cleanup, handleEvent]
  );

  const stop = useCallback(() => {
    cleanup();
    setStatus("idle");
    setError(null);
    setUserTranscript("");
    setTutorText("");
    onToolCallRef.current = null;
  }, [cleanup]);

  // Update the tutor's instructions and tools on a live session. The GA
  // Realtime API (gpt-realtime over /v1/realtime/calls) expects the session
  // type in every session.update; without it the update can be rejected and
  // the tutor silently keeps its old tools.
  const updateSession = useCallback(
    (instructions, tools) => {
      sendEvent({ type: "session.update", session: { type: "realtime", instructions, ...(tools ? { tools } : {}) } });
    },
    [sendEvent]
  );

  // Voice pace for this student. Sent on its own so that, if the API refuses
  // it, the instructions and tools updates are unaffected. Takes effect
  // between turns.
  const setSpeechSpeed = useCallback(
    (speed) => {
      sendEvent({ type: "session.update", session: { type: "realtime", audio: { output: { speed } } } });
    },
    [sendEvent]
  );

  // Ask the tutor to start (or restart) speaking as soon as it is free.
  const requestResponse = useCallback(
    (instructions) => {
      wantResponseRef.current = instructions ? { instructions } : wantResponseRef.current ?? {};
      flushResponse();
    },
    [flushResponse]
  );

  // Answer a function call the tutor made, then let it speak again.
  const sendFunctionCallOutput = answerCall;

  // Tell the tutor something on screen (a button press or practice result)
  // as a quiet user-side note, then let it respond.
  const tellTutor = useCallback(
    (text) => {
      sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }]
        }
      });
      requestResponse();
    },
    [sendEvent, requestResponse]
  );

  return {
    status,
    error,
    userTranscript,
    tutorText,
    bargeIns,
    lastServerError,
    start,
    stop,
    updateSession,
    setSpeechSpeed,
    requestResponse,
    sendFunctionCallOutput,
    tellTutor
  };
}