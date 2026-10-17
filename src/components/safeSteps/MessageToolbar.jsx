import React from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn } from "lucide-react";

export default function MessageToolbar({ zoom, onZoom, onOpenNodes }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-600">Message text size</span>
      <Button variant="outline" size="sm" aria-label="Smaller message text" onClick={() => onZoom(Math.max(1, zoom - 0.25))}>
        A−
      </Button>
      <span className="w-12 text-center text-sm tabular-nums text-slate-600">{Math.round(zoom * 100)}%</span>
      <Button variant="outline" size="sm" aria-label="Larger message text" onClick={() => onZoom(Math.min(2, zoom + 0.25))}>
        A+
      </Button>
      <Button variant="outline" size="sm" onClick={onOpenNodes}>
        <ZoomIn className="mr-1 h-4 w-4" />
        Zoom the phrases
      </Button>
    </div>
  );
}