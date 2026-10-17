import React from "react";
import { Button } from "@/components/ui/button";
import MessageBubble from "./MessageBubble";

export default function StepRead({ send }) {
  return (
    <div className="space-y-4">
      <p className="max-w-xl text-lg text-slate-700">Read the message below. You can also listen with the Voice switch at the top.</p>
      <MessageBubble />
      <Button size="lg" onClick={() => send({ type: "GO_STEP", step: 3 })}>
        I am ready to circle
      </Button>
    </div>
  );
}