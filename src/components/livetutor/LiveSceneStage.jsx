import React from "react";
import AnimationCanvas from "@/components/scholarviz/AnimationCanvas";
import NodeImagePanel from "@/components/scholarviz/NodeImagePanel";
import CameraControls from "@/components/scholarviz/CameraControls";

// The animated lesson inside Live Tutor: the persistent SVG diagram (GSAP
// animation + camera) with the simple node picture floating above the focused
// node. It is driven by the shared lesson state, never by a second professor.
export default function LiveSceneStage({ tutor, canvasRef, guided, hideImage = false, onMoveNode, onSelectNode }) {
  return (
    <div
      data-testid="live-scene-stage"
      className="relative h-[68vh] min-h-[380px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <AnimationCanvas
        ref={canvasRef}
        scene={tutor.scene}
        startStep={tutor.startStep}
        playToken={tutor.playToken}
        playMode={tutor.playMode}
        onStepComplete={tutor.setCurrentStep}
        onAnimatingChange={tutor.setIsAnimating}
        onMoveNode={onMoveNode}
        onUpdateObject={tutor.updateObject}
        onSelectNode={onSelectNode}
      />
      <NodeImagePanel url={guided.imageUrl} label={guided.focusedLabel} hidden={hideImage} />
      <CameraControls
        guided={guided.state.guidedModeEnabled}
        onZoomOut={guided.zoomOut}
        onToggleGuided={() => guided.setGuided(!guided.state.guidedModeEnabled)}
      />
    </div>
  );
}