import React, { useState, useEffect } from "react";
import { Image } from "@/components/ui/image";

// Technical picture for the focused node. Sits ABOVE the node, never over it,
// and takes no space until a picture exists. `hidden` fades it out (without
// unmounting) while values move, so it never covers the lesson.
export default function NodeImagePanel({ url, label, hidden = false }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    if (!url) return undefined;
    const t = setTimeout(() => setShown(true), 30);
    return () => clearTimeout(t);
  }, [url]);

  if (!url) return null;
  return (
    <div
      data-testid="node-image-panel"
      className={`pointer-events-none absolute left-1/2 top-12 h-[38%] w-[min(62%,380px)] -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md transition-opacity duration-500 ${shown && !hidden ? "opacity-100" : "opacity-0"}`}
    >
      <Image src={url} alt={`Technical picture of ${label || "the focused part"}`} fittingType="fit" className="h-full w-full" />
    </div>
  );
}