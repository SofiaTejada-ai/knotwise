import React, { useState } from "react";
import { Headphones, MicOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NodeQuiz from "./NodeQuiz";

// The deeper view under the diagram for one topic: its explanation, the exact
// document lines it comes from, the short quiz at the bottom, and the
// optional professor (hear the topic out loud, then ask questions).
export default function NodeDetail({
  node,
  voiceActive,
  presenting,
  onPresent,
  onStopProfessor,
  onAsk,
  onQuizResult
}) {
  const [question, setQuestion] = useState("");
  if (!node) return null;

  const ask = () => {
    const q = question.trim();
    if (!q) return;
    onAsk?.(q);
    setQuestion("");
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6" data-testid="node-detail">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold text-slate-800">{node.label}</h2>
        {!presenting && (
          <Button className="gap-2" onClick={() => onPresent(node)}>
            <Headphones className="h-4 w-4" />
            Hear this topic
          </Button>
        )}
      </div>

      <p className="text-sm leading-relaxed text-slate-700">{node.explanation}</p>

      {node.excerpt && (
        <blockquote className="rounded-xl border-l-4 border-slate-200 bg-slate-50 px-4 py-2 text-sm italic text-slate-500">
          From your document: {node.excerpt}
        </blockquote>
      )}

      <NodeQuiz key={node.id} node={node} onResult={onQuizResult} />

      {voiceActive && !presenting && (
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-400">
            The professor is listening. Ask out loud, or type quietly if talking is hard today.
          </p>
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="Ask about this topic..."
            />
            <Button variant="outline" onClick={ask} disabled={!question.trim()}>
              <Send className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={onStopProfessor} aria-label="End the professor session">
              <MicOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}