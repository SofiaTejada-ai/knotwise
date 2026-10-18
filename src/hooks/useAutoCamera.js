import { useEffect, useRef } from "react";

// Safety net so the camera always moves on its own: when a diagram appears it
// zooms out, then into the first part, and keeps stepping through the lesson
// whenever the professor has not issued a visual command for a while. The
// professor's own commands go through the same director and reset the timer.
export function useAutoCamera({ scene, active, director, firstNodeId, paused }) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const sceneKey = scene?.objects?.length ? scene.objects.map((o) => o.id).join("|") : "";

  useEffect(() => {
    if (!active || !sceneKey || !director) return;
    let dead = false;
    const lastCmd = () => director.history[director.history.length - 1]?.at ?? 0;
    const stepsPlayed = () =>
      director.history.filter((h) => h.name === "play_step").reduce((m, h) => Math.max(m, Number(h.args?.step_id) || 0), 0);
    const total = scene.sequence?.length ?? 0;

    (async () => {
      await new Promise((r) => setTimeout(r, 700));
      if (dead || director.history.length) return;
      await director.run("show_overview");
      await new Promise((r) => setTimeout(r, 1500));
      if (dead || director.history.length > 1) return;
      if (firstNodeId) await director.run("focus_node", { node_id: firstNodeId });
    })();

    const timer = setInterval(() => {
      // Only hold off while the student is talking; a new command resumes visuals.
      if (dead || pausedRef.current) return;
      if (Date.now() - lastCmd() < 7000 || !director.history.length) return;
      const next = stepsPlayed() + 1;
      if (next <= total) director.run("play_step", { step_id: next });
    }, 3000);

    return () => {
      dead = true;
      clearInterval(timer);
    };
  }, [active, sceneKey]);
}