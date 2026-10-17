import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clapperboard } from "lucide-react";
import TutorRoom from "@/components/safeSteps/TutorRoom";
import ListeningOverlay from "@/components/safeSteps/ListeningOverlay";
import AnimationCanvas from "@/components/scholarviz/AnimationCanvas";
import StepControls from "@/components/scholarviz/StepControls";
import NarrationPanel from "@/components/scholarviz/NarrationPanel";
import SourceHelper from "@/components/scholarviz/SourceHelper";
import { useAnimationTutor } from "@/hooks/useAnimationTutor";
import { createVoiceConnection } from "@/hooks/useVoiceConnection";

const SUGGESTIONS = [
  "How does a scam text reach my phone?",
  "What happens if I tap the link in a scam text?",
  "How do scammers fake a phone number?",
  "Why should I not pay through a text link?"
];

const TOPICS = [
  { id: "network", label: "Phone network", suffix: "Show the phone network side, how numbers and messages travel." },
  { id: "web", label: "Web and links", suffix: "Show the web side, what a link opens." },
  { id: "money", label: "Money and payment", suffix: "Show the payment side, where money and card details go." },
  { id: "math", label: "Math lens", suffix: "Illustrate the mathematics underpinning this concept." }
];

const WELCOME = [
  "Hi, I am your Safe Steps teacher.",
  "Ask me a question out loud, and I will show you an animation."
];

export default function ScholarViz() {
  const tutor = useAnimationTutor();
  const [roomState, setRoomState] = useState("idle"); // idle | listening | thinking | speaking
  const [captions, setCaptions] = useState(WELCOME);
  const [voiceNotice, setVoiceNotice] = useState(null);
  const [topic, setTopic] = useState(null);
  const speakTimer = useRef(null);
  const lastQuestion = useRef(null);

  const showSpeaking = (lines) => {
    setRoomState("speaking");
    setCaptions(lines);
    clearTimeout(speakTimer.current);
    speakTimer.current = setTimeout(() => setRoomState("idle"), 7000);
  };

  const ask = async (text, opts = {}) => {
    const q = String(text ?? "").trim();
    if (!q || tutor.isLoading) return;
    lastQuestion.current = { q, opts };
    setVoiceNotice(null);
    setRoomState("thinking");
    setCaptions(["I am thinking. Please wait."]);
    const suffix = topic ? ` ${topic.suffix}` : "";
    const narration = await tutor.sendMessage(q + suffix, opts);
    if (narration) showSpeaking([narration]);
    else {
      setRoomState("idle");
      setCaptions(["I could not build that animation. Try rephrasing your question."]);
    }
  };

  // Voice: same microphone flow as the lesson (record, store privately,
  // transcribe through the backend). No browser text-to-speech.
  const voiceRef = useRef(null);
  const startVoice = async () => {
    setVoiceNotice(null);
    if (!voiceRef.current) {
      voiceRef.current = createVoiceConnection({
        onTranscribed: (text) => ask(text, { spoken: true }),
        onError: (msg) => {
          setVoiceNotice(msg);
          setRoomState("idle");
        }
      });
    }
    try {
      await voiceRef.current.start();
      setRoomState("listening");
    } catch (err) {
      setVoiceNotice("Voice input is not connected yet. You can type your question instead.");
    }
  };
  const stopVoice = () => {
    voiceRef.current?.stop();
    setRoomState("thinking");
  };
  const cancelVoice = () => {
    voiceRef.current?.cancel();
    setRoomState("idle");
  };

  const handleNew = () => {
    tutor.reset();
    setCaptions(WELCOME);
    setRoomState("idle");
    setTopic(null);
    setVoiceNotice(null);
  };

  const seq = tutor.scene?.sequence ?? [];
  const step = seq[tutor.currentStep];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Safe Steps Visual Tutor</h1>
          <p className="text-xs text-slate-500">Ask out loud. I will answer with an animation.</p>
        </div>
        <Link to="/" className="ml-2 text-sm text-blue-600 underline">
          Back to lesson
        </Link>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={!tutor.scene} onClick={() => tutor.replay()}>
            Replay
          </Button>
          <Button variant="outline" size="sm" onClick={handleNew}>
            New
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row">
        <div className="flex min-h-[440px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:w-[65%]">
          <div className="relative min-h-[360px] flex-1">
            <AnimationCanvas
              scene={tutor.scene}
              startStep={tutor.startStep}
              playToken={tutor.playToken}
              playMode={tutor.playMode}
              onStepComplete={tutor.setCurrentStep}
              onAnimatingChange={tutor.setIsAnimating}
              onMoveNode={tutor.moveNode}
              onUpdateObject={tutor.updateObject}
            />
            <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-lg bg-white/95 px-3 py-1.5 text-xs shadow-sm">
              {step ? (
                <>
                  <span className="font-semibold text-slate-700">
                    STEP {tutor.currentStep + 1} of {seq.length}
                  </span>
                  {step.description && <span className="block text-slate-500">{step.description}</span>}
                </>
              ) : (
                <span className="text-slate-400">No scene yet. Ask a question.</span>
              )}
            </div>
            {tutor.isLoading && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow">
                generating…
              </div>
            )}
            {tutor.scene?.title && (
              <div className="pointer-events-none absolute right-3 top-3 max-w-[45%] truncate rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                {tutor.scene.title}
              </div>
            )}
          </div>
          <div className="flex justify-center border-t border-slate-200 p-3">
            <StepControls
              total={seq.length}
              current={tutor.currentStep}
              disabled={tutor.isAnimating || tutor.isLoading}
              onPrev={() => tutor.prevStep()}
              onReplay={() => tutor.replayStep()}
              onGoTo={(i) => tutor.goToStep(i)}
              onNext={() => tutor.nextStep()}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 lg:w-[35%]">
          <TutorRoom roomState={roomState} lines={captions} voiceNotice={voiceNotice} onMicPress={startVoice} />
          <SourceHelper source={tutor.source} />
          <NarrationPanel
            messages={tutor.messages}
            isLoading={tutor.isLoading}
            error={tutor.error}
            onRetry={() => lastQuestion.current && ask(lastQuestion.current.q, lastQuestion.current.opts)}
            onSend={(text) => ask(text)}
            suggestions={SUGGESTIONS}
            topics={TOPICS}
            topic={topic}
            onTopic={setTopic}
            onClearTopic={() => setTopic(null)}
          />
        </div>
      </div>

      {roomState === "listening" && <ListeningOverlay onStop={stopVoice} onCancel={cancelVoice} />}
    </div>
  );
}