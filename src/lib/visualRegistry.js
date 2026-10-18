import Timeline from "@/components/lesson/visuals/Timeline";
import Comparison from "@/components/lesson/visuals/Comparison";
import Whiteboard from "@/components/lesson/visuals/Whiteboard";
import DragDrop from "@/components/lesson/visuals/DragDrop";

// The registry of visuals the shared professor stage can show. A visual
// spec is only rendered if it passes its kind's check, so a malformed one
// falls back to an error message instead of a blank or broken screen.
const isArr = (a, min) => Array.isArray(a) && a.length >= min;

export const VISUALS = {
  animation: { label: "Animation", spoken: true },
  timeline: {
    label: "Timeline",
    Component: Timeline,
    valid: (d) => isArr(d?.events, 2)
  },
  comparison: {
    label: "Compare",
    Component: Comparison,
    valid: (d) => isArr(d?.rows, 2) && !!d?.leftTitle && !!d?.rightTitle
  },
  whiteboard: {
    label: "Whiteboard",
    Component: Whiteboard,
    valid: (d) => isArr(d?.lines, 2)
  },
  dragdrop: {
    label: "Sort it",
    Component: DragDrop,
    valid: (d) => isArr(d?.zones, 2) && isArr(d?.items, 3)
  }
};

export const VISUAL_KINDS = Object.keys(VISUALS);

export function isValidVisual(v) {
  const def = VISUALS[v?.kind];
  return !!def?.Component && isArr(v?.steps, 1) && def.valid(v.data);
}