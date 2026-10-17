import React from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X } from "lucide-react";
import { Image as UiImage } from "@/components/ui/image";

// Dismissible picture-help overlay above the canvas. It generates in the
// background, so the live tutor audio keeps running the whole time.
export default function ImageHelpOverlay({ state, url, label, onDismiss, onRetry }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-full w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <ImageIcon className="h-4 w-4" />
            Picture help{label ? `: ${label}` : ""}
          </span>
          <Button size="sm" variant="ghost" onClick={onDismiss} aria-label="Dismiss picture">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">
          {state === "loading" && (
            <div className="space-y-3 py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
              <p className="text-sm text-slate-500">
                Drawing a picture to help. Keep talking with your tutor, it will appear here.
              </p>
            </div>
          )}
          {state === "ready" && url && (
            <UiImage src={url} alt={`Illustration for ${label}`} className="w-full" fittingType="fit" />
          )}
          {state === "error" && (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-slate-500">The picture could not be created.</p>
              <Button size="sm" variant="outline" onClick={onRetry}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}