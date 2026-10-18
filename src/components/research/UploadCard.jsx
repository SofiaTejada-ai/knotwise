import React, { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx";
const STEPS = ["Uploading your document...", "Reading your document...", "Building your lesson diagram..."];

// The research route's starting point: pick a class document and turn it
// into a lesson.
export default function UploadCard({ onStart, busy, busyStep, error }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="space-y-2">
        <Label>Choose your material</Label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 hover:border-slate-400"
        >
          <FileUp className="h-6 w-6" />
          {file ? file.name : "Tap to pick a PDF, Word, or PowerPoint file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {busy ? (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {STEPS[Math.min(busyStep, STEPS.length - 1)]}
        </div>
      ) : (
        <Button size="lg" className="w-full" disabled={!file} onClick={() => file && onStart(file)}>
          Build my lesson
        </Button>
      )}

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <p className="text-xs text-slate-400">
        PDFs work today. Word and PowerPoint files need a conversion service that is not connected yet.
      </p>
      <p className="text-xs text-slate-400">
        Rather just ask a question?{" "}
        <Link to="/scholarviz" className="underline hover:text-slate-600">
          Ask the professor
        </Link>
        .
      </p>
    </div>
  );
}