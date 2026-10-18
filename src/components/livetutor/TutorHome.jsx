import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GRADES = [
  "Ages 6-8 (Grades 1-3)",
  "Ages 9-11 (Grades 4-5)",
  "Ages 12-14 (Grades 6-8)",
  "Ages 15-18 (Grades 9-12)"
];

const SUBJECTS = [
  "Scam texts and online safety",
  "Math",
  "Science",
  "Reading and writing",
  "Something else, I will ask out loud"
];

const PREFS = [
  { id: "slowerPacing", label: "Slower pacing" },
  { id: "captions", label: "Captions" },
  { id: "simpler", label: "Simpler explanations" },
  { id: "reducedMotion", label: "Reduced motion" }
];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function TutorHome({ onStart, error, busy }) {
  const [ageRange, setAgeRange] = useState("");
  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState("");
  const [prefs, setPrefs] = useState({});
  const [typedQuestion, setTypedQuestion] = useState("");

  const ready = ageRange && subject;

  const handleStart = () => {
    if (!ready) return;
    const profile = {
      ageRange,
      subject,
      goal: goal.trim(),
      slowerPacing: !!prefs.slowerPacing,
      captions: !!prefs.captions,
      simpler: !!prefs.simpler,
      reducedMotion: !!prefs.reducedMotion
    };
    onStart(profile, typedQuestion.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-semibold text-slate-800">cyber8LiveTutor</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up your tutor, then ask anything out loud. You never need to tell us a diagnosis.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <Label>My age or grade</Label>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <Chip key={g} active={ageRange === g} onClick={() => setAgeRange(g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject I want to explore</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <Chip key={s} active={subject === s} onClick={() => setSubject(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">My goal today</Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="For example: learn to spot scam texts"
            />
          </div>

          <div className="space-y-2">
            <Label>Learning preferences (optional)</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PREFS.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
                >
                  <Checkbox
                    checked={!!prefs[p.id]}
                    onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.id]: !!v }))}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="typed">Or type your question if talking is hard today</Label>
            <Input
              id="typed"
              value={typedQuestion}
              onChange={(e) => setTypedQuestion(e.target.value)}
              placeholder="For example: how do scammers fake a phone number?"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button size="lg" className="w-full gap-2" disabled={!ready || busy} onClick={handleStart}>
            <Mic className="h-5 w-5" />
            {busy ? "Building your learning map..." : "Start live tutor"}
          </Button>
          <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
            <Sparkles className="h-3 w-3" /> Your tutor listens, then builds a visual map of your question.
          </p>
          <p className="text-center text-xs text-slate-400">
            Want to study your own document instead?{" "}
            <Link to="/research" className="underline hover:text-slate-600">
              Open the research tool
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}