import React from "react";
import { Button } from "@/components/ui/button";
import * as L from "@/lib/safeStepsLogic";
import MessageBubble from "./MessageBubble";

export default function StepReview({ state, send, zoom }) {
  const idx = state.reviewIndex;
  const highlight = idx >= 0 && idx < L.FLAGS.length ? L.FLAGS[idx].id : null;
  return (
    <div className="space-y-4">
      <p className="max-w-xl text-lg text-slate-700">Every red flag you found is marked below. Go over them one at a time.</p>
      <MessageBubble forceFound highlightId={highlight} zoom={zoom} />
      <div>
        {idx < 4 ? (
          <Button size="lg" onClick={() => send({ type: "REVIEW_NEXT" })}>
            {idx < 0 ? "Show the first red flag" : `Next red flag (${idx + 2} of 5)`}
          </Button>
        ) : (
          <Button size="lg" onClick={() => send({ type: "GO_STEP", step: 5 })}>
            Yes, show me the sources
          </Button>
        )}
      </div>
    </div>
  );
}