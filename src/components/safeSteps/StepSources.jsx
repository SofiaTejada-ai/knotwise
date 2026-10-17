import React from "react";
import { Button } from "@/components/ui/button";
import MessageBubble from "./MessageBubble";

export default function StepSources({ send, zoom }) {
  return (
    <div className="space-y-4">
      <p className="max-w-xl text-lg text-slate-700">
        Every card in the Evidence panel shows the government source behind a rule. Press a card to hear about it, or
        open the source yourself with Check it yourself.
      </p>
      <MessageBubble forceFound zoom={zoom} />
      <Button size="lg" onClick={() => send({ type: "GO_STEP", step: 6 })}>
        I am done with the sources
      </Button>
    </div>
  );
}