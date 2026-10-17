import React from "react";
import StepWelcome from "./StepWelcome";
import StepRead from "./StepRead";
import StepCircle from "./StepCircle";
import StepReview from "./StepReview";
import StepSources from "./StepSources";
import QuizPanel from "./QuizPanel";

export default function StepArea({ state, calm, send, onQuickTour }) {
  switch (state.step) {
    case 1:
      return <StepWelcome send={send} onQuickTour={onQuickTour} />;
    case 2:
      return <StepRead send={send} />;
    case 3:
      return <StepCircle state={state} calm={calm} send={send} />;
    case 4:
      return <StepReview state={state} send={send} />;
    case 5:
      return <StepSources send={send} />;
    case 6:
      return <QuizPanel state={state} send={send} />;
    default:
      return null;
  }
}