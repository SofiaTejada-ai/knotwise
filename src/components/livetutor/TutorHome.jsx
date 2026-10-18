import React, { useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Knotwise live tutor start screen: no setup quiz, just start talking.
export default function TutorHome({ onStart, error, busy }) {
  const [typedQuestion, setTypedQuestion] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-semibold text-slate-800">Knotwise Live Tutor</h1>
          <p className="mt-2 text-sm text-slate-500">
            Ask anything out loud. Your tutor listens, then explains it with pictures, step by step.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="typed">Prefer to type? Add your question here (optional)</Label>
          <Input
            id="typed"
            value={typedQuestion}
            onChange={(e) => setTypedQuestion(e.target.value)}
            placeholder="For example: how do rainbows form?"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button size="lg" className="w-full gap-2" disabled={busy} onClick={() => onStart({}, typedQuestion.trim())}>
          <Mic className="h-5 w-5" />
          {busy ? "Building your learning map..." : "Start the tutor"}
        </Button>
      </div>
    </div>
  );
}