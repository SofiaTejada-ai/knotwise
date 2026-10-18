import React from "react";
import { Link } from "react-router-dom";
import { Mic, FileSearch, ShieldCheck, ArrowRight, LineChart, Clapperboard } from "lucide-react";
import SessionHistory from "@/components/home/SessionHistory";

const ROUTES = [
  {
    to: "/livetutor",
    icon: Mic,
    title: "General Questions",
    text: "Talk with a patient tutor who listens to your question and explains it with pictures, one step at a time."
  },
  {
    to: "/research",
    icon: FileSearch,
    title: "Research",
    text: "Upload a class document and learn it with clear diagrams, exact quotes from your material, and short checks."
  },
  {
    to: "/scholarviz",
    icon: Clapperboard,
    title: "Visual Tutor",
    text: "Ask any question and watch it animated step by step. Drag the pieces to explore."
  },
  {
    to: "/graph-lesson",
    icon: LineChart,
    title: "Function Graphs",
    text: "Guess first, then drag a slider and watch a line, curve or wave change. Works offline."
  },
  {
    to: "/lesson",
    icon: ShieldCheck,
    title: "Practice Lesson",
    text: "A guided lesson that teaches you to spot the red flags in a scam text message, with sources you can verify."
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
            <Link to="/livetutor" className="hover:text-slate-900">Live tutor</Link>
            <Link to="/research" className="hover:text-slate-900">Research</Link>
            <Link to="/lesson" className="hover:text-slate-900">Practice lesson</Link>
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
          Knotwise explains ideas out loud, draws them as pictures and diagrams, and shows you the
          official sources behind every rule, so you can check everything yourself.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/livetutor"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            Ask a question <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/research"
            className="inline-flex items-center rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900"
          >
            Study a document
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ROUTES.map((route) => (
            <Link
              key={route.to}
              to={route.to}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <route.icon className="h-8 w-8 text-slate-900" />
              <h2 className="mt-4 font-heading text-lg font-semibold text-slate-900">{route.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{route.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-900">
                Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
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