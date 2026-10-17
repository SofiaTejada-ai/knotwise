import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as L from "@/lib/safeStepsLogic";

export default function WhyThisWorks({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Why this works</DialogTitle>
        </DialogHeader>
        <ul className="space-y-3">
          {L.DESIGN_RULES.map((r) => (
            <li key={r.need} className="text-sm leading-relaxed text-slate-700">
              <span className="font-medium text-slate-800">{r.need}:</span> {r.feature}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}