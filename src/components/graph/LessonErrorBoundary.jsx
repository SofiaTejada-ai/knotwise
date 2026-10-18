import React from "react";

// Never a blank screen: plain message plus a way back to a saved lesson.
export default class LessonErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Lesson error", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] p-6 text-[#1B2A49]">
        <div className="max-w-md space-y-4 text-center" role="alert">
          <p className="text-lg">Something went wrong while showing this lesson. Nothing you saved was lost.</p>
          <button
            type="button"
            onClick={() => window.location.assign("/graph-lesson?f=linear")}
            className="h-11 rounded-lg bg-[#2E8B8B] px-5 font-semibold text-white"
          >
            Open saved lesson
          </button>
        </div>
      </div>
    );
  }
}