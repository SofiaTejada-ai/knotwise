import React from "react";
import { Button } from "@/components/ui/button";
import * as L from "@/lib/safeStepsLogic";
import DrawingBoard from "./DrawingBoard";
import MessageBubble from "./MessageBubble";

export default function StepCircle({ state, calm, send }) {
  const foundCount = L.accounted(state).length;
  const done = L.allAccounted(state);
  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-slate-800">Found {foundCount} of 5</p>
      {state.inputMode === "draw" ? (
        <DrawingBoard
          calm={calm}
          foundIds={state.found}
          hintedIds={state.outlined}
          boardEmpty={foundCount === 0}
          onResults={(results) => send({ type: "STROKES", results })}
        />
      ) : (
        <MessageBubble
          interactive
          foundIds={state.found}
          hintedIds={state.outlined}
          onTap={(id) => send({ type: "TAP", id })}
        />
      )}
      <div className="flex flex-wrap gap-3">
        {!done && (
          <>
            <Button variant="outline" onClick={() => send({ type: "HINT" })}>
              Hint
            </Button>
            <Button
              variant="outline"
              onClick={() => send({ type: "SET_INPUT", mode: state.inputMode === "draw" ? "tap" : "draw" })}
            >
              {state.inputMode === "draw" ? "Switch to tap mode" : "Switch to drawing"}
            </Button>
          </>
        )}
        {done && (
          <Button size="lg" onClick={() => send({ type: "GO_STEP", step: 4 })}>
            Yes, go over each one
          </Button>
        )}
      </div>
    </div>
  );
}