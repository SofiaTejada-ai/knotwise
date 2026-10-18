import React from "react";
import { Button } from "@/components/ui/button";
import { ZoomOut, Video } from "lucide-react";

export default function CameraControls({ guided, onZoomOut, onToggleGuided }) {
  return (
    <div className="absolute bottom-3 left-3 flex gap-2" data-testid="camera-controls">
      <Button size="sm" variant="outline" className="bg-white/95" onClick={onZoomOut}>
        <ZoomOut className="mr-1 h-4 w-4" /> Zoom out
      </Button>
      <Button size="sm" variant="outline" className="bg-white/95" aria-pressed={guided} onClick={onToggleGuided}>
        <Video className="mr-1 h-4 w-4" /> Guided camera {guided ? "on" : "off"}
      </Button>
    </div>
  );
}