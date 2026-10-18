import { useEffect, useRef } from "react";
import { trace } from "@/lib/lessonTrace";

// Safety net for the live lesson, in two parts:
//  1. Autopilot: when a diagram appears the camera zooms out and then into the
//     first part; if the professor has not sent a visual command for a while,
//     the next planned step (or real data-structure operation) is played, so
//     the picture never stands still.
//  2. Stall watchdog: if an animation is flagged as running but its timeline
//     has stopped progressing (and is not legitimately paused), it is
//     recovered. The last committed state is kept, remaining state changes are
//     committed once, and the voice session is never touched.
export function useAutoCamera({ scene, active, director, firstNodeId, paused, canvasRef, isAnimating }) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const animRef = useRef(isAnimating);
  animRef.current = isAnimating;
  const sceneId = scene?.scene_id ?? "";
  const sceneKey = scene?.objects?.length ? scene.objects.map((o) => o.id).join("|") + sceneId : "";
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  useEffect(() => {
    if (!active || !sceneKey || !director) return undefined;
    let dead = false;
    const mine = () => director.history.filter((h) => h.scene === sceneId);
    const lastCmd = () => mine().slice(-1)[0]?.at ?? 0;
    const sc = () => sceneRef.current;

    (async () => {
      await new Promise((r) => setTimeout(r, 700));
      if (dead || mine().length) return;
      await director.run("show_overview");
      await new Promise((r) => setTimeout(r, 1200));
      if (dead || mine().length > 1) return;
      if (firstNodeId) await director.run("focus_node", { node_id: firstNodeId });
    })();

    const stepper = setInterval(() => {
      // Only hold off while the student is talking; a new command resumes visuals.
      if (dead || pausedRef.current || director.pending() > 0) return;
      if (Date.now() - lastCmd() < 7000 || !mine().length) return;
      const s = sc();
      // Real data structures are never changed by the fallback: only the
      // professor's explicit operations may change their contents, so what is
      // said, shown and stored always agree.
      if (s?.ds) return;
      const total = s?.sequence?.length ?? 0;
      const played = mine()
        .filter((h) => h.name === "play_step")
        .reduce((m, h) => Math.max(m, Number(h.args?.step_id) || 0), 0);
      if (played + 1 <= total) director.run("play_step", { step_id: played + 1 });
    }, 3000);

    return () => {
      dead = true;
      clearInterval(stepper);
    };
  }, [active, sceneKey]);

  // Stall watchdog.
  useEffect(() => {
    if (!active) return undefined;
    let lastTime = -2;
    let still = 0;
    const timer = setInterval(() => {
      const h = canvasRef?.current?.getHealth?.();
      if (!h || !animRef.current) {
        still = 0;
        return;
      }
      const legitimatelyPaused = h.tlPaused || h.globalPaused || pausedRef.current;
      if (legitimatelyPaused) {
        still = 0;
        return;
      }
      // Flagged as animating with no timeline at all, or a timeline that stopped advancing.
      const stuck = !h.has || h.time === lastTime;
      lastTime = h.time;
      still = stuck ? still + 1 : 0;
      if (still >= 3) {
        still = 0;
        trace("stall_detected", { progress: Math.round((h.progress || 0) * 100) });
        canvasRef.current.recover();
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [active]);
}