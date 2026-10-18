import React from "react";
import { Link } from "react-router-dom";
import { Mic, FileText, ArrowRight, Workflow, RotateCcw } from "lucide-react";
import SessionHistory from "@/components/home/SessionHistory";

// Everything happens inside Live Tutor; these describe what it does.
const FEATURES = [
  {
    icon: Mic,
    title: "A professor you talk to",
    text: "Ask any question out loud and interrupt whenever you like. The professor explains it calmly, at your pace."
  },
  {
    icon: Workflow,
    title: "Diagrams that move with the lesson",
    text: "Values travel between parts, the camera follows, and the diagram grows when you ask why or what if."
  },
  {
    icon: FileText,
    title: "Your own class material",
    text: "Add lecture slides, papers or notes (PDF, Word, PowerPoint). The professor teaches from them and says where each idea comes from."
  },
  {
    icon: RotateCcw,
    title: "Replays and new examples",
    text: "Say \"show that again, slower\" or \"give me another example\". It adapts to how you learn during the session."
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-heading text-xl font-semibold tracking-tight text-slate-900">
            Knotwise
          </Link>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <Link to="/livetutor" className="hover:text-slate-900">Live Tutor</Link>
            <Link to="/#history" className="hover:text-slate-900">History &amp; review quizzes</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
        <p className="mx-auto w-fit rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm text-slate-600">
          Calm, visual learning for every student
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          One patient tutor. Any question.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Knotwise explains ideas out loud and draws them as animated diagrams, from any question or from
          your own class material, so you can see exactly how things work.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/livetutor"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            Start Live Tutor <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/livetutor"
            className="inline-flex items-center rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900"
          >
            Learn from my class material
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              to="/livetutor"
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <f.icon className="h-8 w-8 text-slate-900" />
              <h2 className="mt-4 font-heading text-lg font-semibold text-slate-900">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <SessionHistory />

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        Knotwise · calm, source-checked learning
      </footer>
    </div>
  );
}