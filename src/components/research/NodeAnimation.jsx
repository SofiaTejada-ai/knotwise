import React, { useState } from "react";
import { Clapperboard, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ProfessorCanvas from "@/components/lesson/ProfessorCanvas";
import SpokenVisual from "@/components/lesson/SpokenVisual";
import { useAnimationTutor } from "@/hooks/useAnimationTutor";
import { VISUALS, VISUAL_KINDS } from "@/lib/visualRegistry";

// The visual explanation of one topic, built only from the student's own
// document text, shown on the shared professor stage. The student picks the
// kind of visual: animation, timeline, comparison, whiteboard or sort-it.
export default function NodeAnimation({ node, docTitle }) {
  const tutor = useAnimationTutor();
  const [kind, setKind] = useState("animation");
  const [visuals, setVisuals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const groundingText = `${node.label}\n${node.explanation}\n${node.excerpt ?? ""}`;
  const isAnim = kind === "animation";
  const ready = isAnim ? !!tutor.scene : !!visuals[kind];
  const busy = isAnim ? tutor.isLoading : loading;

  const generate = async () => {
    setError("");
    if (isAnim) {
      tutor.sendMessage(`Animate this topic from "${docTitle}": ${node.label}. ${node.explanation}`, { groundingText });
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("buildVisual", { kind, topic: node.label, groundingText });
      const v = res?.data?.visual;
      if (!v) throw new Error("none");
      setVisuals((p) => ({ ...p, [kind]: v }));
    } catch {
      setError("I could not build that visual from this topic. Try another kind.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4" data-testid="node-animation">
      <p className="flex items-center gap-2 font-medium text-slate-800">
        <Clapperboard className="h-4 w-4 text-indigo-600" />
        Visual explanation
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {VISUAL_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              setError("");
            }}
            className={`min-h-[44px] rounded-full border px-4 text-sm focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-blue-600 ${
              kind === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {VISUALS[k].label}
          </button>
        ))}
        <Button className="ml-auto min-h-[44px] gap-2" disabled={busy} onClick={generate}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {ready ? "Make a new one" : `Make a ${VISUALS[kind].label.toLowerCase()}`}
        </Button>
      </div>

      {(isAnim ? tutor.error : error) && <p className="text-sm text-red-600">{isAnim ? tutor.error : error}</p>}

      {isAnim && tutor.scene && <ProfessorCanvas tutor={tutor} groundingText={groundingText} />}
      {!isAnim && visuals[kind] && <SpokenVisual key={visuals[kind].title + kind} spec={visuals[kind]} />}
    </div>
  );
}