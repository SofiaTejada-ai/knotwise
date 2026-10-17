import React from "react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Loader2, ImageIcon, AlertCircle, RotateCcw } from "lucide-react";

// The Visual Agent's picture for the active node. Generation starts in the
// background while the tutor speaks; this card shows an honest loading state
// and never pretends a picture exists. The concept map stays fully usable
// on screen the whole time.
export default function NodeVisualCard({ visual, onRetry }) {
  if (!visual) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
        <ImageIcon className="h-3.5 w-3.5" />
        Picture for this topic
      </p>

      {visual.state === "loading" && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          Drawing a picture for this idea. Your tutor keeps talking and the map stays on screen.
        </div>
      )}

      {visual.state === "ready" && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
          <Image
            src={visual.url}
            alt={`Illustration for ${visual.label}`}
            className="h-44 w-full object-cover"
            fittingType="fill"
          />
        </div>
      )}

      {visual.state === "error" && (
        <div className="mt-3 space-y-2 rounded-xl bg-slate-50 px-3 py-3">
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            The picture could not be created. The interactive map on screen still shows this idea.
          </p>
          <Button size="sm" variant="outline" className="gap-1" onClick={onRetry}>
            <RotateCcw className="h-3.5 w-3.5" />
            Try the picture again
          </Button>
        </div>
      )}
    </div>
  );
}