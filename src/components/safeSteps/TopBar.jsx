import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import * as L from "@/lib/safeStepsLogic";

export default function TopBar({ state, seconds, calm, onCalm, onPause, onWhy, onReset }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const title = L.STEPS.find((s) => s.num === state.step)?.title ?? "";
  return (
    <header className="border-b border-slate-200 bg-[color:var(--ss-accent-soft)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="text-lg font-semibold text-slate-800">Safe Steps</span>
        <span className="text-sm text-slate-600">Step {state.step} of 6: {title}</span>
        <span className="text-sm tabular-nums text-slate-600" aria-label="Session timer">{mm}:{ss}</span>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <Switch id="calm-switch" checked={calm} onCheckedChange={onCalm} aria-label="Calm mode" />
            <label htmlFor="calm-switch" className="text-sm text-slate-700">Calm mode</label>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/scholarviz">Visual tutor</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={onPause}>Need a break?</Button>
          <Button variant="outline" size="sm" onClick={onWhy}>Why this works</Button>
          <Button variant="outline" size="sm" onClick={onReset}>Reset lesson</Button>
        </div>
      </div>
    </header>
  );
}