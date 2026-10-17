import React from "react";
import { Button } from "@/components/ui/button";
import * as L from "@/lib/safeStepsLogic";

export default function StepWelcome({ send, onQuickTour }) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-slate-800">Learn to spot scam text messages</h1>
      <p className="max-w-xl text-lg leading-relaxed text-slate-700">
        You will read one text message and learn to find the 5 red flags inside it. You can draw circles or tap,
        listen or read, and take a break at any time. Every rule comes from a government website that you can check
        yourself.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={() => send({ type: "GO_STEP", step: 2 })}>
          Yes, start (try it yourself)
        </Button>
        <Button size="lg" variant="outline" onClick={onQuickTour}>
          Quick tour (1 minute)
        </Button>
      </div>
    </div>
  );
}