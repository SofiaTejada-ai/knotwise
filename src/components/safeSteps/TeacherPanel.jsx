import React, { useEffect, useState } from "react";

export default function TeacherPanel({ lines, speechKey, voiceOn }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSpeaking(true);
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (voiceOn && synth) {
      synth.cancel();
      let remaining = lines.length;
      if (remaining === 0) {
        setSpeaking(false);
        return;
      }
      lines.forEach((line) => {
        const u = new SpeechSynthesisUtterance(line);
        u.rate = 0.95;
        u.onend = () => {
          if (!cancelled) {
            remaining -= 1;
            if (remaining === 0) setSpeaking(false);
          }
        };
        u.onerror = u.onend;
        synth.speak(u);
      });
      return () => {
        cancelled = true;
        synth.cancel();
      };
    }
    const t = setTimeout(() => {
      if (!cancelled) setSpeaking(false);
    }, 2600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechKey, voiceOn]);

  return (
    <div className={`mb-5 flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 ${speaking ? "ss-speaking" : ""}`}>
      <div className="ss-orb" aria-hidden="true">
        <span className="ss-orb-dot" />
      </div>
      <div aria-live="polite" className="min-w-0 space-y-1">
        {lines.map((l, i) => (
          <p key={i} className="text-base leading-relaxed text-slate-700">{l}</p>
        ))}
      </div>
    </div>
  );
}